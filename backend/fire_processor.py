"""
Fire Data Processing Module
Filters and classifies fire data based on confidence levels.
Handles both MODIS (numeric 0-100) and VIIRS (categorical: l, n, h) data.
"""

def is_water_location(lat, lon):
    """
    Simple heuristic to detect if coordinates are likely in water.
    This is a basic check - for production, use a proper land/water dataset.
    
    Args:
        lat: Latitude
        lon: Longitude
        
    Returns:
        Boolean indicating if location is likely water
    """
    # Major ocean regions (very basic filtering)
    # Pacific Ocean
    if -180 <= lon <= -100 and -60 <= lat <= 60:
        return True
    # Atlantic Ocean (mid-ocean)
    if -60 <= lon <= -10 and -60 <= lat <= 60:
        return True
    # Indian Ocean
    if 40 <= lon <= 100 and -60 <= lat <= 20:
        return True
    
    # This is a simplified check. For better accuracy, integrate with
    # a land/water mask dataset or reverse geocoding service
    return False


def process_fire_data(fire_data_list):
    """
    Filters and classifies fire data based on user-defined severity buckets.
    
    Args:
        fire_data_list: List of fire detection dictionaries from FIRMS API
        
    Returns:
        List of processed hotspots with severity classifications
    """
    processed_hotspots = []

    for point in fire_data_list:
        raw_conf = point.get('confidence')
        normalized_conf = 0
        
        # Check if location is in water - skip if true
        lat = point.get('latitude')
        lon = point.get('longitude')
        if is_water_location(lat, lon):
            continue
        
        # --- STEP 1: NORMALIZE CONFIDENCE VALUES FOR FILTERING ---
        
        # CASE A: MODIS (Numeric 0-100)
        if isinstance(raw_conf, (int, float)):
            normalized_conf = int(raw_conf)
            
        # CASE B: VIIRS (String 'l', 'n', 'h')
        # We map these to specific numeric buckets for filtering only
        elif isinstance(raw_conf, str):
            raw_conf_lower = raw_conf.lower().strip()
            if raw_conf_lower == 'l' or raw_conf_lower == 'low':
                normalized_conf = 30  # Low -> Filtered out
            elif raw_conf_lower == 'n' or raw_conf_lower == 'nominal':
                normalized_conf = 75  # Nominal -> Medium bucket
            elif raw_conf_lower == 'h' or raw_conf_lower == 'high':
                normalized_conf = 95  # High -> High bucket
            else:
                # Try to parse as number if it's a numeric string
                try:
                    normalized_conf = int(float(raw_conf))
                except (ValueError, TypeError):
                    normalized_conf = 0
            
        # --- STEP 2: FILTER & CLASSIFY WITH GRADIENT COLORS ---
        
        # Filter: Skip anything below 50
        if normalized_conf < 50:
            continue

        # New color system with gradients
        severity_label = ""
        severity_color = ""

        if 50 <= normalized_conf < 60:
            # Low - Mild green
            severity_label = "Low"
            severity_color = "#90EE90"  # Mild green
        elif 60 <= normalized_conf < 80:
            # Medium - Yellow
            severity_label = "Medium"
            severity_color = "#FFD700"  # Yellow
        elif 80 <= normalized_conf < 90:
            # Approaching Stage 1 - Gradient from yellow to orange
            severity_label = "High"
            ratio = (normalized_conf - 80) / 10  # 0 to 1
            severity_color = interpolate_color("#FFD700", "#FF8C00", ratio)
        elif 90 <= normalized_conf <= 100:
            # Stage 1 confirmed - Orange
            severity_label = "Stage 1"
            severity_color = "#FF8C00"  # Orange
        
        # --- STEP 3: CONSTRUCT CLEAN DATA ---
        # Keep ORIGINAL confidence value, not normalized
        clean_point = {
            "latitude": lat,
            "longitude": lon,
            "confidence": raw_conf,  # ORIGINAL confidence value
            "confidence_normalized": normalized_conf,  # For internal use only
            "severity_label": severity_label,
            "display_color": severity_color,
            "satellite": point.get('satellite'),  # Keep original satellite name
            "acq_date": point.get('acq_date'),
            "acq_time": point.get('acq_time'),
            "frp": point.get('frp'),  # Fire Radiative Power
            "brightness": point.get('brightness'),
            "source": point.get('source')  # Keep original source name
        }
        
        processed_hotspots.append(clean_point)

    return processed_hotspots


def interpolate_color(color1_hex, color2_hex, ratio):
    """
    Interpolate between two hex colors
    
    Args:
        color1_hex: Starting color (e.g., "#FFD700")
        color2_hex: Ending color (e.g., "#FF8C00")
        ratio: 0.0 to 1.0
        
    Returns:
        Interpolated hex color
    """
    # Convert hex to RGB
    c1 = tuple(int(color1_hex[i:i+2], 16) for i in (1, 3, 5))
    c2 = tuple(int(color2_hex[i:i+2], 16) for i in (1, 3, 5))
    
    # Interpolate
    r = int(c1[0] + (c2[0] - c1[0]) * ratio)
    g = int(c1[1] + (c2[1] - c1[1]) * ratio)
    b = int(c1[2] + (c2[2] - c1[2]) * ratio)
    
    return f'#{r:02x}{g:02x}{b:02x}'



def csv_to_fire_data(csv_text, source_name):
    """
    Convert CSV text from FIRMS API to fire data list.
    
    Args:
        csv_text: CSV text from FIRMS API
        source_name: Name of the satellite source (preserved as-is)
        
    Returns:
        List of fire data dictionaries
    """
    lines = csv_text.strip().split('\n')
    if len(lines) < 2:
        return []
    
    headers = [h.strip().lower() for h in lines[0].split(',')]
    fire_data = []
    
    # Find column indices
    lat_idx = headers.index('latitude') if 'latitude' in headers else -1
    lon_idx = headers.index('longitude') if 'longitude' in headers else -1
    conf_idx = headers.index('confidence') if 'confidence' in headers else -1
    frp_idx = headers.index('frp') if 'frp' in headers else -1
    date_idx = headers.index('acq_date') if 'acq_date' in headers else -1
    time_idx = headers.index('acq_time') if 'acq_time' in headers else -1
    
    # Find brightness column (might be bright_ti4, bright_ti5, etc.)
    bright_idx = -1
    for i, h in enumerate(headers):
        if 'bright' in h:
            bright_idx = i
            break
    
    # Find satellite column
    sat_idx = headers.index('satellite') if 'satellite' in headers else -1
    
    for i in range(1, len(lines)):
        line = lines[i].strip()
        if not line:
            continue
            
        cols = line.split(',')
        
        try:
            lat = float(cols[lat_idx]) if lat_idx >= 0 else None
            lon = float(cols[lon_idx]) if lon_idx >= 0 else None
            
            if lat is None or lon is None:
                continue
            
            # Parse confidence (could be numeric or string) - KEEP ORIGINAL
            conf_raw = cols[conf_idx].strip() if conf_idx >= 0 else 'nominal'
            
            # Get satellite name from CSV (original name)
            satellite_name = cols[sat_idx].strip() if sat_idx >= 0 else ''
            
            fire_point = {
                'latitude': lat,
                'longitude': lon,
                'confidence': conf_raw,  # Keep original (string or number)
                'frp': float(cols[frp_idx]) if frp_idx >= 0 and cols[frp_idx].strip() else 10.0,
                'acq_date': cols[date_idx].strip() if date_idx >= 0 else '',
                'acq_time': cols[time_idx].strip() if time_idx >= 0 else '',
                'brightness': float(cols[bright_idx]) if bright_idx >= 0 and cols[bright_idx].strip() else 300.0,
                'satellite': satellite_name,  # Original satellite name from CSV
                'source': source_name  # Keep original source name
            }
            
            fire_data.append(fire_point)
            
        except (ValueError, IndexError) as e:
            # Skip malformed rows
            continue
    
    return fire_data
