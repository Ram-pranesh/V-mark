"""
Test script for fire data processing
"""
import json
from fire_processor import process_fire_data

# Mock Data simulating a mix of MODIS (numeric) and VIIRS (string)
api_response_mock = [
    {"latitude": 13.02, "longitude": 80.22, "confidence": 95, "satellite": "Terra", "frp": 150, "brightness": 350, "acq_date": "2026-02-01", "acq_time": "0830", "source": "MODIS Terra/Aqua"},     # High MODIS
    {"latitude": 11.01, "longitude": 76.95, "confidence": 40, "satellite": "Aqua", "frp": 20, "brightness": 300, "acq_date": "2026-02-01", "acq_time": "0845", "source": "MODIS Terra/Aqua"},      # Junk MODIS (Should disappear)
    {"latitude": 12.50, "longitude": 78.10, "confidence": "h", "satellite": "N20", "frp": 180, "brightness": 360, "acq_date": "2026-02-01", "acq_time": "0900", "source": "VIIRS NOAA-20"},      # High VIIRS
    {"latitude": 12.60, "longitude": 78.20, "confidence": "n", "satellite": "SNPP", "frp": 90, "brightness": 330, "acq_date": "2026-02-01", "acq_time": "0915", "source": "VIIRS SNPP"},     # Nominal VIIRS
    {"latitude": 13.10, "longitude": 79.50, "confidence": 60, "satellite": "Terra", "frp": 45, "brightness": 310, "acq_date": "2026-02-01", "acq_time": "0930", "source": "MODIS Terra/Aqua"},      # Low-Range MODIS
    {"latitude": 12.80, "longitude": 77.60, "confidence": "l", "satellite": "SNPP", "frp": 15, "brightness": 295, "acq_date": "2026-02-01", "acq_time": "0945", "source": "VIIRS SNPP"},      # Low VIIRS (Should disappear)
    {"latitude": 14.00, "longitude": 81.00, "confidence": 78, "satellite": "Aqua", "frp": 120, "brightness": 340, "acq_date": "2026-02-01", "acq_time": "1000", "source": "MODIS Terra/Aqua"},      # Medium MODIS
]

classified_data = process_fire_data(api_response_mock)

print("=" * 80)
print("FIRE DATA PROCESSING TEST")
print("=" * 80)
print(f"\nTotal input detections: {len(api_response_mock)}")
print(f"Filtered detections (confidence >= 60): {len(classified_data)}")
print(f"Removed: {len(api_response_mock) - len(classified_data)}")
print("\n" + "=" * 80)
print("PROCESSED HOTSPOTS:")
print("=" * 80)
print(json.dumps(classified_data, indent=2))
print("\n" + "=" * 80)
print("SUMMARY BY SEVERITY:")
print("=" * 80)

severity_counts = {}
for point in classified_data:
    severity = point['severity_label']
    severity_counts[severity] = severity_counts.get(severity, 0) + 1

for severity, count in sorted(severity_counts.items()):
    print(f"{severity}: {count} detections")

print("=" * 80)
