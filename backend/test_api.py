import requests
import json

url = "http://localhost:8000/api/verify-fire"
payload = {"lat": 34.05, "lon": -118.24}
headers = {"Content-Type": "application/json"}

print(f"Sending POST request to {url}...")
try:
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Request Error: {e}")
