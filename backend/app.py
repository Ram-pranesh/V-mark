import os
from flask import Flask, jsonify, send_from_directory, request
import requests
from dotenv import load_dotenv
from fire_processor import process_fire_data, csv_to_fire_data
from india_hotspot_filter import filter_hotspots_for_india, is_point_in_india

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


@app.get("/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
