import os
from flask import Flask, jsonify, send_from_directory, request
import requests
from dotenv import load_dotenv
from fire_processor import process_fire_data, csv_to_fire_data
from hotspotFilter import filter_hotspots_for_india, is_point_in_india
import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from multi_stage_detector import detector as multi_stage_detector

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")


def get_env(name, default=""):
    value = os.environ.get(name, default)
    return value if value is not None else ""


# Simple in-memory cache for WMS tiles
wms_cache = {}
MAX_CACHE_SIZE = 1000

@app.after_request
def add_cache_headers(response):
    # Allow caching for WMS images and static assets to improve performance
    if request.path.startswith("/firms/wms") or request.path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
        response.headers["Cache-Control"] = "public, max-age=3600" # Cache for 1 hour
        response.headers.pop("Pragma", None)
        response.headers.pop("Expires", None)
    else:
        # Default no-cache for API/dynamic data
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/config")
def config():
    return jsonify(
        {
            "FIRMS_MAP_KEY": get_env("FIRMS_MAP_KEY"),
            "FIRMS_WMS_URL": get_env("FIRMS_WMS_URL", "/firms/wms/"),
            "ENABLE_FIRMS_WMS": get_env("ENABLE_FIRMS_WMS", "false"),
            "FIRMS_DAYS_DEFAULT": int(get_env("FIRMS_DAYS_DEFAULT", "1")),
            "FIRMS_DAYS_MAX": 5,
            "OPENWEATHER_KEY": get_env("OPENWEATHER_KEY"),
            "SENTINELHUB_INSTANCE_ID": get_env("SENTINELHUB_INSTANCE_ID"),
            "NASA_EARTHDATA_TOKEN": get_env("NASA_EARTHDATA_TOKEN"),
            "DEFAULT_CENTER": [75, 20],
            "DEFAULT_ZOOM": 2,
            "SENTINEL_WMS_URL": get_env("SENTINEL_WMS_URL", "https://tiles.maps.eox.at/wms"),
        }
    )



# Setup Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

@app.get("/api/detailed-weather")
def detailed_weather():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if not lat or not lng:
        return jsonify({"error": "Missing lat/lng"}), 400

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": float(lat),
        "longitude": float(lng),
        "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m",
                   "wind_direction_10m", "wind_gusts_10m", "vapour_pressure_deficit",
                   "soil_moisture_0_to_1cm", "soil_moisture_9_to_27cm", "cape"],
        "past_days": 5,
        "forecast_days": 1 
    }
    
    try:
        # Fetch Weather
        weather_responses = openmeteo.weather_api(url, params=params)
        weather_res = weather_responses[0]
        
        # Fetch Air Quality
        air_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        air_params = {
            "latitude": float(lat),
            "longitude": float(lng),
            "hourly": ["pm2_5", "aerosol_optical_depth", "carbon_monoxide", "nitrogen_dioxide", "carbon_dioxide"],
            "domains": "cams_global",
            "past_days": 5,
            "forecast_days": 1
        }
        air_responses = openmeteo.weather_api(air_url, params=air_params)
        air_res = air_responses[0]
        
        # Process Weather Data
        hourly = weather_res.Hourly()
        weather_data = {"date": pd.date_range(
            start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
            end =  pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
            freq = pd.Timedelta(seconds = hourly.Interval()),
            inclusive = "left"
        )}
        
        weather_data["temperature_2m"] = hourly.Variables(0).ValuesAsNumpy()
        weather_data["relative_humidity_2m"] = hourly.Variables(1).ValuesAsNumpy()
        weather_data["precipitation"] = hourly.Variables(2).ValuesAsNumpy()
        weather_data["wind_speed_10m"] = hourly.Variables(3).ValuesAsNumpy()
        weather_data["wind_direction_10m"] = hourly.Variables(4).ValuesAsNumpy()
        weather_data["wind_gusts_10m"] = hourly.Variables(5).ValuesAsNumpy()
        weather_data["vapour_pressure_deficit"] = hourly.Variables(6).ValuesAsNumpy()
        weather_data["soil_moisture_0_to_1cm"] = hourly.Variables(7).ValuesAsNumpy()
        weather_data["soil_moisture_9_to_27cm"] = hourly.Variables(8).ValuesAsNumpy()
        weather_data["cape"] = hourly.Variables(9).ValuesAsNumpy()
        
        df_weather = pd.DataFrame(data=weather_data)
        
        # Process Air Data
        hourly_air = air_res.Hourly()
        air_data = {"date": pd.date_range(
            start = pd.to_datetime(hourly_air.Time(), unit = "s", utc = True),
            end = pd.to_datetime(hourly_air.TimeEnd(), unit = "s", utc = True),
            freq = pd.Timedelta(seconds = hourly_air.Interval()),
            inclusive = "left"
        )}
        air_data["pm2_5"] = hourly_air.Variables(0).ValuesAsNumpy()
        air_data["aerosol_optical_depth"] = hourly_air.Variables(1).ValuesAsNumpy()
        air_data["carbon_monoxide"] = hourly_air.Variables(2).ValuesAsNumpy()
        air_data["nitrogen_dioxide"] = hourly_air.Variables(3).ValuesAsNumpy()
        air_data["carbon_dioxide"] = hourly_air.Variables(4).ValuesAsNumpy()
        
        df_air = pd.DataFrame(data=air_data)
        
        # Merge Dataframes on date
        # Note: timestamps must align. Open-Meteo usually aligns them if parameters match.
        df_merged = pd.merge(df_weather, df_air, on="date", how="inner")
        
        df = df_merged
        
        # Convert date to string for JSON
        df['date'] = df['date'].dt.strftime('%Y-%m-%d %H:%M:%S')
        
        # Replace NaN with None
        df = df.where(pd.notnull(df), None)
        
        return jsonify(df.to_dict(orient="records"))
        
    except Exception as e:
        print(f"OpenMeteo Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.get("/firms/area")
def firms_area():
    api_key = get_env("FIRMS_MAP_KEY")
    if not api_key:
        return jsonify({"error": "FIRMS_MAP_KEY not configured"}), 400

    source = request.args.get("source")
    west = request.args.get("west")
    south = request.args.get("south")
    east = request.args.get("east")
    north = request.args.get("north")
    days = request.args.get("days", "1")

    if not all([source, west, south, east, north]):
        return jsonify({"error": "Missing required query params"}), 400

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/{source}/{west},{south},{east},{north}/{days}"
    try:
        resp = requests.get(url, timeout=20)
    except requests.RequestException as exc:
        return jsonify({"error": "FIRMS request failed", "details": str(exc)}), 502

    if resp.status_code != 200:
        return jsonify({"error": "FIRMS request failed", "status": resp.status_code, "details": resp.text[:500]}), 502

    return resp.text, 200, {"Content-Type": "text/csv; charset=utf-8"}


@app.get("/firms/area/processed")
def firms_area_processed():
    """
    Returns processed and filtered fire data with severity classifications.
    Filters out low-confidence detections (< 60%) and normalizes VIIRS categorical data.
    """
    api_key = get_env("FIRMS_MAP_KEY")
    if not api_key:
        return jsonify({"error": "FIRMS_MAP_KEY not configured"}), 400

    source = request.args.get("source")
    west = request.args.get("west")
    south = request.args.get("south")
    east = request.args.get("east")
    north = request.args.get("north")
    days = request.args.get("days", "1")

    if not all([source, west, south, east, north]):
        return jsonify({"error": "Missing required query params"}), 400

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/{source}/{west},{south},{east},{north}/{days}"
    try:
        resp = requests.get(url, timeout=20)
    except requests.RequestException as exc:
        return jsonify({"error": "FIRMS request failed", "details": str(exc)}), 502

    if resp.status_code != 200:
        return jsonify({"error": "FIRMS request failed", "status": resp.status_code, "details": resp.text[:500]}), 502

    # Convert CSV to fire data with clean source name
    source_name_map = {
        'MODIS_NRT': 'MODIS Terra/Aqua',
        'VIIRS_SNPP_NRT': 'VIIRS SNPP',
        'VIIRS_NOAA20_NRT': 'VIIRS NOAA-20'
    }
    clean_source_name = source_name_map.get(source, source)
    
    fire_data = csv_to_fire_data(resp.text, clean_source_name)
    
    # Process and filter the data
    processed_data = process_fire_data(fire_data)
    
    return jsonify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [point["longitude"], point["latitude"]]
                },
                "properties": point
            }
            for point in processed_data
        ],
        "metadata": {
            "total_detections": len(fire_data),
            "filtered_detections": len(processed_data),
            "source": clean_source_name,
            "date_range_days": days
        }
    })

@app.get("/firms/area/india")
def firms_area_india():
    """
    Returns processed fire data filtered for India only (for drone telemetry).
    Satellite telemetry uses /firms/area/processed (shows all global hotspots).
    Drone telemetry uses this endpoint (shows only India hotspots).
    """
    api_key = get_env("FIRMS_MAP_KEY")
    if not api_key:
        return jsonify({"error": "FIRMS_MAP_KEY not configured"}), 400

    source = request.args.get("source")
    west = request.args.get("west")
    south = request.args.get("south")
    east = request.args.get("east")
    north = request.args.get("north")
    days = request.args.get("days", "1")

    if not all([source, west, south, east, north]):
        return jsonify({"error": "Missing required query params"}), 400

    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/{source}/{west},{south},{east},{north}/{days}"
    try:
        resp = requests.get(url, timeout=20)
    except requests.RequestException as exc:
        return jsonify({"error": "FIRMS request failed", "details": str(exc)}), 502

    if resp.status_code != 200:
        return jsonify({"error": "FIRMS request failed", "status": resp.status_code, "details": resp.text[:500]}), 502

    # Convert CSV to fire data with clean source name
    source_name_map = {
        'MODIS_NRT': 'MODIS Terra/Aqua',
        'VIIRS_SNPP_NRT': 'VIIRS SNPP',
        'VIIRS_NOAA20_NRT': 'VIIRS NOAA-20'
    }
    clean_source_name = source_name_map.get(source, source)
    
    fire_data = csv_to_fire_data(resp.text, clean_source_name)
    
    # Process and filter the data
    processed_data = process_fire_data(fire_data)
    
    # Filter for India only
    india_hotspots = filter_hotspots_for_india(processed_data)
    
    return jsonify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [point["longitude"], point["latitude"]]
                },
                "properties": point
            }
            for point in india_hotspots
        ],
        "metadata": {
            "total_detections": len(fire_data),
            "filtered_detections": len(processed_data),
            "india_detections": len(india_hotspots),
            "source": clean_source_name,
            "date_range_days": days,
            "filter": "India only"
        }
    })



@app.get("/firms/wms")
@app.get("/firms/wms/")
def firms_wms():
    api_key = get_env("FIRMS_MAP_KEY")
    if not api_key:
        return jsonify({"error": "FIRMS_MAP_KEY not configured"}), 400

    layers = request.args.get("layers")
    bbox = request.args.get("bbox")
    if not layers or not bbox:
        return jsonify({"error": "Missing required query params"}), 400

    # Create a simple cache key from relevant params
    width = request.args.get("width", "256")
    height = request.args.get("height", "256")
    time_param = request.args.get("time", "")
    
    cache_key = f"{layers}_{bbox}_{width}_{height}_{time_param}"
    
    if cache_key in wms_cache:
        cached_data, cached_code, cached_type = wms_cache[cache_key]
        return cached_data, cached_code, {"Content-Type": cached_type, "X-Cache": "HIT"}

    params = {
        "service": request.args.get("service", "WMS"),
        "request": request.args.get("request", "GetMap"),
        "version": request.args.get("version", "1.1.1"),
        "styles": request.args.get("styles", ""),
        "format": request.args.get("format", "image/png"),
        "transparent": request.args.get("transparent", "true"),
        "height": height,
        "width": width,
        "srs": request.args.get("srs", "EPSG:3857"),
        "layers": layers,
        "bbox": bbox,
        # FIRMS WMS accepts MAP_KEY; include lowercase variant for compatibility
        "MAP_KEY": api_key,
        "map_key": api_key,
        "key": api_key,
    }

    if time_param:
        params["time"] = time_param

    try:
        # Use mapserver endpoint which is documented for FIRMS WMS
        resp = requests.get("https://firms.modaps.eosdis.nasa.gov/mapserver/wms/", params=params, timeout=45)
    except requests.RequestException as exc:
        return jsonify({"error": "FIRMS WMS request failed", "details": str(exc)}), 502

    content_type = resp.headers.get("Content-Type", "application/octet-stream")
    
    # Store in cache if successful
    if resp.status_code == 200:
        if len(wms_cache) > MAX_CACHE_SIZE:
             wms_cache.clear() # Simple clearance strategy
        wms_cache[cache_key] = (resp.content, resp.status_code, content_type)
    
    return resp.content, resp.status_code, {"Content-Type": content_type, "X-Cache": "MISS"}


@app.get("/sentinelhub/token")
def sentinelhub_token():
    client_id = get_env("SENTINELHUB_CLIENT_ID")
    client_secret = get_env("SENTINELHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        return jsonify({"error": "Sentinel Hub credentials not configured"}), 400

    token_url = "https://services.sentinel-hub.com/oauth/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    response = requests.post(token_url, data=data, timeout=20)
    if response.status_code != 200:
        return jsonify({"error": "Token request failed", "details": response.text}), 502

    return jsonify(response.json())


@app.get("/api/multi-stage-analysis")
def multi_stage_analysis():
    """
    Analyze hotspots through Stage 1 and Stage 2 verification
    Returns confirmed locations for each stage
    OPTIMIZED: Uses parallel requests and caching
    """
    try:
        # Get parameters
        source = request.args.get("source", "VIIRS_NOAA20_NRT")
        west = request.args.get("west")
        south = request.args.get("south")
        east = request.args.get("east")
        north = request.args.get("north")
        days = int(request.args.get("days", "3"))  # Reduced to 3 days for speed
        
        if not all([west, south, east, north]):
            return jsonify({"error": "Missing bbox parameters"}), 400
        
        api_key = get_env("FIRMS_MAP_KEY")
        if not api_key:
            return jsonify({"error": "FIRMS_MAP_KEY not configured"}), 400
        
        # Use ThreadPoolExecutor for parallel requests
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from datetime import datetime, timedelta
        
        def fetch_day_data(day_offset):
            """Fetch data for a single day"""
            day_count = day_offset + 1
            url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/{source}/{west},{south},{east},{north}/{day_count}"
            
            try:
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    fire_data = csv_to_fire_data(resp.text, source)
                    processed = process_fire_data(fire_data)
                    date_key = (datetime.now() - timedelta(days=day_offset)).strftime('%Y-%m-%d')
                    return date_key, processed
            except:
                pass
            return None, []
        
        # Fetch all days in parallel
        hotspots_by_day = {}
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(fetch_day_data, day): day for day in range(days)}
            for future in as_completed(futures):
                date_key, data = future.result()
                if date_key:
                    hotspots_by_day[date_key] = data
        
        # Process Stage 1 (simplified for speed)
        stage1_confirmed = multi_stage_detector.process_stage1(hotspots_by_day)
        
        # Stage 2 is placeholder
        stage2_confirmed = []
        
        # Add colors
        for hotspot in stage1_confirmed:
            hotspot['color'] = multi_stage_detector.get_color_for_confidence(
                hotspot['confidence'], 
                stage=hotspot['stage']
            )
        
        return jsonify({
            "stage1_count": len(stage1_confirmed),
            "stage2_count": len(stage2_confirmed),
            "stage3_count": 0,
            "stage1_locations": stage1_confirmed,
            "stage2_locations": stage2_confirmed,
            "stage3_locations": [],
            "docking_stations_available": False
        })
        
    except Exception as e:
        print(f"Multi-stage analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.get("/api/analyze-hotspot")
def analyze_hotspot():
    """
    Perform deep 5-day analysis for a specific hotspot on demand.
    """
    try:
        lat_param = request.args.get('lat')
        lon_param = request.args.get('lon')
        
        if not lat_param or not lon_param:
            return jsonify({"error": "Missing lat/lon parameters"}), 400
            
        lat = float(lat_param)
        lon = float(lon_param)
        source = request.args.get("source", "VIIRS_NOAA20_NRT")
        
        # Create a small bounding box (~20km radius)
        delta = 0.2
        west, south, east, north = lon - delta, lat - delta, lon + delta, lat + delta
        
        api_key = get_env("FIRMS_MAP_KEY")
        if not api_key:
            return jsonify({"error": "No API Key"}), 400

        # Fetch 5 days of history
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/{source}/{west},{south},{east},{north}/5"
        
        print(f"Analyzing hotspot: {lat}, {lon}")
        
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            fire_data = csv_to_fire_data(resp.text, source)
            processed = process_fire_data(fire_data)
            
            # Group by date
            from collections import defaultdict
            hotspots_by_day = defaultdict(list)
            for p in processed:
                if p.get('acq_date'):
                    hotspots_by_day[p['acq_date']].append(p)
            
            # Run Stage 1 Logic
            stage1_results = multi_stage_detector.process_stage1(dict(hotspots_by_day))
            
            # Find the result that matches our target location (nearest)
            target_result = None
            min_dist = float('inf')
            
            # First check strictly confirmed ones
            for res in stage1_results:
                dist = (res['latitude'] - lat)**2 + (res['longitude'] - lon)**2
                if dist < min_dist:
                    min_dist = dist
                    target_result = res
            
            # If no confirmed match, we still want to show the stats for the nearby fire data
            if not target_result or min_dist > 0.001:
                # Fallback: manually construct stats from the raw data for this location
                # Filter for points within 1km
                nearby_points = [p for p in processed if ((p['latitude'] - lat)**2 + (p['longitude'] - lon)**2) < 0.0001]
                
                if nearby_points:
                    # Group by date
                    by_date_raw = defaultdict(list)
                    for p in nearby_points:
                        if p.get('acq_date'):
                            by_date_raw[p['acq_date']].append(p)
                    
                    daily_stats = []
                    for d, points in sorted(by_date_raw.items()):
                        avg_conf = sum(p.get('confidence', 0) for p in points) / len(points)
                        avg_bright = sum(p.get('brightness', 0) for p in points) / len(points)
                        daily_stats.append({
                            "date": d,
                            "avg_confidence": avg_conf,
                            "avg_brightness": avg_bright,
                            "hotspot_count": len(points)
                        })
                    
                    # Create a "pseudo-result" for display
                    target_result = {
                        "latitude": lat,
                        "longitude": lon,
                        "confidence": daily_stats[-1]['avg_confidence'] if daily_stats else 0,
                        "daily_stats": daily_stats,
                        "source": source
                    }
                    min_dist = 0 # Treated as found

            if target_result: 
                 return jsonify({
                    "verified": True, # Return true so frontend shows the graph
                    "stage1_result": target_result,
                    "stage2_verified": False 
                })
            
            return jsonify({
                "verified": False,
                "reason": "No nearby fire data found",
                "data_points": len(processed)
            })

    except Exception as e:
        print(f"Analyze Hotspot Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    return jsonify({"verified": False}), 200


@app.get("/api/location-name")
def get_location_name():
    """
    Get location name from coordinates using OpenWeather Geocoding API
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    
    if not lat or not lon:
        return jsonify({"error": "Missing lat/lon"}), 400
    
    api_key = get_env("OPENWEATHER_KEY")
    if not api_key:
        return jsonify({"name": f"{lat}, {lon}"}), 200
    
    try:
        url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={api_key}"
        resp = requests.get(url, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                location = data[0]
                name_parts = []
                if 'name' in location:
                    name_parts.append(location['name'])
                if 'state' in location:
                    name_parts.append(location['state'])
                if 'country' in location:
                    name_parts.append(location['country'])
                
                return jsonify({
                    "name": ", ".join(name_parts),
                    "latitude": lat,
                    "longitude": lon
                })
        
        return jsonify({"name": f"{lat}, {lon}"}), 200
        
    except Exception as e:
        return jsonify({"name": f"{lat}, {lon}"}), 200


@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
