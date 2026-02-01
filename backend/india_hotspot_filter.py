from shapely.geometry import Point, Polygon
import json

# India's approximate boundary polygon (simplified)
# Coordinates: [longitude, latitude]
INDIA_BOUNDARY = Polygon([
    [68.1766, 7.9654],      # Southern tip (near Kanyakumari)
    [68.1766, 35.5087],     # Northern Kashmir
    [97.3953, 28.5435],     # Northeast (Arunachal Pradesh)
    [92.5271, 21.9342],     # Eastern coast (near Bangladesh)
    [88.0599, 21.5812],     # West Bengal coast
    [80.2707, 13.0827],     # Tamil Nadu coast
    [77.5946, 12.9716],     # Karnataka
    [72.8777, 19.0760],     # Maharashtra coast
    [68.1766, 23.7337],     # Gujarat coast
    [68.1766, 7.9654]       # Close the polygon
])

# More precise India boundary (detailed polygon)
INDIA_DETAILED_BOUNDARY = Polygon([
    # West coast - Gujarat to Kerala
    [68.20, 23.70], [69.50, 23.90], [70.50, 22.50], [72.50, 21.00],
    [72.80, 19.00], [73.00, 18.50], [74.00, 16.00], [75.00, 13.00],
    [76.50, 10.00], [77.50, 8.50],
    
    # South - Kerala to Tamil Nadu
    [77.50, 8.00], [78.00, 8.50], [79.00, 10.00], [80.00, 12.00],
    
    # East coast - Tamil Nadu to West Bengal
    [80.30, 13.10], [82.00, 16.00], [84.00, 18.00], [85.00, 19.50],
    [87.00, 21.50], [88.50, 22.50], [89.00, 23.00],
    
    # Northeast - West Bengal to Arunachal Pradesh
    [89.50, 25.00], [90.50, 26.00], [92.00, 26.50], [94.00, 27.50],
    [95.50, 28.00], [97.00, 28.50],
    
    # North - Arunachal to Jammu & Kashmir
    [96.50, 29.00], [94.00, 29.50], [92.00, 30.00], [88.00, 27.50],
    [85.00, 27.00], [82.00, 29.00], [80.00, 30.50], [78.00, 31.50],
    [77.00, 32.50], [76.00, 33.00], [75.00, 34.00], [74.00, 35.00],
    
    # West - Kashmir to Gujarat
    [73.50, 34.50], [73.00, 33.00], [72.00, 32.00], [71.00, 30.00],
    [70.00, 28.00], [69.00, 26.00], [68.50, 24.50], [68.20, 23.70]
])


def is_point_in_india(latitude, longitude):
    """
    Check if a point (lat, lon) is within India's boundaries.
    
    Args:
        latitude (float): Latitude of the point
        longitude (float): Longitude of the point
    
    Returns:
        bool: True if point is in India, False otherwise
    """
    point = Point(longitude, latitude)
    return INDIA_DETAILED_BOUNDARY.contains(point)


def filter_hotspots_for_india(hotspots_data):
    """
    Filter hotspots to include only those within India.
    
    Args:
        hotspots_data (list): List of hotspot dictionaries with 'latitude' and 'longitude'
    
    Returns:
        list: Filtered list containing only India hotspots
    """
    india_hotspots = []
    
    for hotspot in hotspots_data:
        lat = hotspot.get('latitude')
        lon = hotspot.get('longitude')
        
        if lat is not None and lon is not None:
            if is_point_in_india(lat, lon):
                india_hotspots.append(hotspot)
    
    return india_hotspots


def filter_geojson_for_india(geojson_data):
    """
    Filter GeoJSON FeatureCollection to include only India hotspots.
    
    Args:
        geojson_data (dict): GeoJSON FeatureCollection
    
    Returns:
        dict: Filtered GeoJSON with only India features
    """
    if geojson_data.get('type') != 'FeatureCollection':
        return geojson_data
    
    india_features = []
    
    for feature in geojson_data.get('features', []):
        if feature.get('geometry', {}).get('type') == 'Point':
            coords = feature['geometry']['coordinates']
            lon, lat = coords[0], coords[1]
            
            if is_point_in_india(lat, lon):
                india_features.append(feature)
    
    return {
        'type': 'FeatureCollection',
        'features': india_features
    }


def process_firms_data(firms_response):
    """
    Process FIRMS API response and filter for India.
    
    Args:
        firms_response (list): Raw FIRMS API response
    
    Returns:
        list: Filtered hotspots within India
    """
    india_hotspots = []
    
    for hotspot in firms_response:
        lat = hotspot.get('latitude')
        lon = hotspot.get('longitude')
        
        if lat and lon:
            if is_point_in_india(float(lat), float(lon)):
                india_hotspots.append(hotspot)
    
    return india_hotspots


# Example usage
if __name__ == "__main__":
    # Test with sample hotspots
    sample_hotspots = [
        {"latitude": 28.6139, "longitude": 77.2090, "name": "Delhi"},  # India
        {"latitude": 19.0760, "longitude": 72.8777, "name": "Mumbai"},  # India
        {"latitude": 51.5074, "longitude": -0.1278, "name": "London"},  # UK (should be filtered)
        {"latitude": 40.7128, "longitude": -74.0060, "name": "New York"},  # USA (should be filtered)
        {"latitude": 13.0827, "longitude": 80.2707, "name": "Chennai"},  # India
    ]
    
    print("Testing India Hotspot Filter...")
    print(f"\nTotal hotspots: {len(sample_hotspots)}")
    
    india_only = filter_hotspots_for_india(sample_hotspots)
    
    print(f"India hotspots: {len(india_only)}")
    print("\nFiltered hotspots:")
    for hotspot in india_only:
        print(f"  - {hotspot['name']}: ({hotspot['latitude']}, {hotspot['longitude']})")
    
    # Test GeoJSON filtering
    sample_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [77.2090, 28.6139]},
                "properties": {"name": "Delhi"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-0.1278, 51.5074]},
                "properties": {"name": "London"}
            }
        ]
    }
    
    print("\n\nTesting GeoJSON Filter...")
    filtered_geojson = filter_geojson_for_india(sample_geojson)
    print(f"Original features: {len(sample_geojson['features'])}")
    print(f"Filtered features: {len(filtered_geojson['features'])}")
    print(f"Remaining: {[f['properties']['name'] for f in filtered_geojson['features']]}")
