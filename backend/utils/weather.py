import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENWEATHER_KEY = os.environ.get("OPENWEATHER_KEY")

def get_current_weather(lat, lon):
    """
    Fetches current weather data from OpenWeatherMap.
    Returns a dictionary with temperature, wind, and description.
    """
    if not OPENWEATHER_KEY:
        print("Error: OPENWEATHER_KEY not configured.")
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHER_KEY,
        "units": "metric"  # Celsius
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        weather_info = {
            "temp": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"].get("deg", 0),
            "description": data["weather"][0]["description"],
            "city": data.get("name", "Unknown Location")
        }
        return weather_info

    except requests.RequestException as e:
        print(f"Weather API Error: {e}")
        return None
