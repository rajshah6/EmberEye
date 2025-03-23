import requests
import csv
import random
from io import StringIO
from flask import Flask
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
from geopy.geocoders import Nominatim
import time

# MongoDB setup
uri = os.environ.get('MONGO_API')
client = MongoClient(uri, server_api=ServerApi('1'))

# Flask setup
app = Flask(__name__)
CORS(app)

# MongoDB collections
db = client["user_data"]
wildfire_coordinates = db["wildfire_coord"]


def fetch_wildfire_coordinates():
    API_KEY = os.environ.get('NASA_API')
    URL = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_SNPP_NRT/world/7"

    response = requests.get(URL)
    if response.status_code == 200:
        csv_data = StringIO(response.text)
        reader = csv.DictReader(csv_data)

        fire_locations = [(float(row["longitude"]), float(row["latitude"])) for row in reader if
                          "latitude" in row and "longitude" in row]
        return fire_locations
    else:
        print(f"Error fetching data: {response.status_code}")
        return []


def get_wind_data(lat, lon):
    OPENWEATHER_API_KEY = os.environ.get('OP')
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"

    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()

            # Extract relevant weather parameters
            wind_data = {
                "temperature": data["main"]["temp"],  # °C
                "humidity": data["main"]["humidity"],  # %
                "wind_speed": data["wind"]["speed"],  # m/s
                "wind_direction": data["wind"]["deg"],  # °
                "wind_gust": data["wind"].get("gust", "N/A"),  # m/s (optional)
                "rain": data.get("rain", {}).get("1h", 0),  # mm (last 1 hour)
                "clouds": data["clouds"]["all"],  # % cloud cover
            }
            return wind_data

    except Exception as e:
        print(f"Error fetching weather data for {lat}, {lon}: {e}")

    return None


def get_location_name(lat, lon):
    """
    Get country and state name from latitude and longitude using Nominatim geocoder
    """
    try:
        geolocator = Nominatim(user_agent="wildfire_app")
        location = geolocator.reverse((lat, lon), exactly_one=True)

        if location:
            address = location.raw.get('address', {})
            return {
                "country": address.get('country'),
                "state": address.get('state', address.get('county', address.get('province')))
            }
    except Exception as e:
        print(f"Error getting location name for {lat}, {lon}: {e}")

    # Return None if we can't get location info
    return None


def reset_and_add_wildfire_coords():
    fire_locations = fetch_wildfire_coordinates()

    if fire_locations:
        wildfire_coordinates.delete_many({})  # Clear collection before inserting

        for index, location in enumerate(fire_locations):
            if (index + 1) % 280 == 0:  # Insert every 280th location
                data = {"location": list(location)}
                try:
                    wildfire_coordinates.insert_one(data)
                except Exception as e:
                    print(f"Failed to insert coordinate at index {index}: {e}")
    else:
        print("No fire locations fetched.")


def add_metadata_to_documents():
    """
    Add both wind data and location names to wildfire documents
    """
    fire_documents = wildfire_coordinates.find()

    for doc in fire_documents:
        try:
            longitude, latitude = doc["location"]

            # Add wind data
            wind_data = get_wind_data(latitude, longitude)

            # Retry with rounded coordinates if API fails
            if not wind_data:
                rounded_lat = round(latitude, 1)
                rounded_lon = round(longitude, 1)
                wind_data = get_wind_data(rounded_lat, rounded_lon)

            # Generate random weather data if API still fails
            if not wind_data:
                print(f"Generating random weather data for {latitude}, {longitude}")
                wind_data = {
                    "temperature": random.uniform(-10, 50),  # °C
                    "humidity": random.randint(10, 90),  # %
                    "wind_speed": random.uniform(0, 50),  # m/s
                    "wind_direction": random.randint(0, 360),  # °
                    "wind_gust": random.uniform(0, 50),  # m/s
                    "rain": random.uniform(0, 20),  # mm
                    "clouds": random.randint(0, 100),  # %
                }

            # Get location name data
            location_data = get_location_name(latitude, longitude)

            # If location lookup fails, add placeholders
            if not location_data:
                location_data = {
                    "country": "Unknown",
                    "state": "Unknown"
                }

            # Combine all data
            update_data = {**wind_data, **location_data}

            # Update MongoDB document with all new data
            wildfire_coordinates.update_one(
                {"_id": doc["_id"]},
                {"$set": update_data}
            )

            # Sleep briefly to avoid hitting rate limits on Nominatim
            time.sleep(0.1)

        except Exception as e:
            print(f"Error processing document {doc['_id']}: {e}")


