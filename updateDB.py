import requests
import csv
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import random

# MongoDB setup
uri = "mongodb+srv://doctormali123:N14h8jnPvQF1Io5G@map.wakq4.mongodb.net/?appName=Map"
client = MongoClient(uri, server_api=ServerApi('1'))

# Flask setup
app = Flask(__name__)
CORS(app)

# MongoDB collections
db = client["user_data"]
wildfire_coordinates = db["wildfire_coord"]


def fetch_wildfire_coordinates():
    API_KEY = "1bfe409f7f9d49ad3d55b555b191c463"  # Replace with your actual key
    URL = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_SNPP_NRT/world/7"

    response = requests.get(URL)
    if response.status_code == 200:
        csv_data = StringIO(response.text)
        reader = csv.DictReader(csv_data)

        fire_locations = [(row["longitude"], row["latitude"]) for row in reader if
                          "latitude" in row and "longitude" in row]
        return fire_locations  # Return all locations
    else:
        print(f"Error fetching data: {response.status_code}")
        return []


def get_wind_data(lat, lon):
    NOAA_API_URL = f"https://api.weather.gov/points/{lat},{lon}"
    headers = {"User-Agent": "MyWeatherApp"}  # Required by NOAA API
    response = requests.get(NOAA_API_URL, headers=headers)

    if response.status_code == 200:
        data = response.json()
        forecast_url = data["properties"]["forecastHourly"]  # Get hourly forecast link

        # Fetch hourly forecast data
        forecast_response = requests.get(forecast_url, headers=headers)
        if forecast_response.status_code == 200:
            forecast_data = forecast_response.json()
            wind_info = forecast_data["properties"]["periods"][0]  # Current period
            return {
                "wind_speed": f"{data['wind']['speed']} m/s",
                "wind_direction": data['wind']['deg'],
                "temperature": data['main']['temp'],
                "humidity": data['main']['humidity']
            }
    except Exception as e:
        print(f"Error fetching weather data: {e}")
    return None


def reset_and_add_wildfire_coords():
    fire_locations = fetch_wildfire_coordinates()

    if fire_locations:
        # Clear existing data in wildfire_coord collection
        wildfire_coordinates.delete_many({})

        # Insert every 100th location from the list into the MongoDB collection
        for index, location in enumerate(fire_locations):
            if (index + 1) % 200 == 0:  # Check if index is a multiple of 200 (every 200th entry)
                data = {
                    "location": location
                }
                try:
                    result = wildfire_coordinates.insert_one(data)
                except Exception as e:
                    print(f"Failed to insert coordinate at index {index}: {e}")
    else:
        print("No fire locations fetched.")


def add_wind_data_to_documents():
    fire_documents = wildfire_coordinates.find()

    for doc in fire_documents:
        latitude, longitude = doc["location"]

        # First attempt to fetch wind data
        wind_data = get_wind_data(latitude, longitude)

        # If wind data is not found, round coordinates to 1 decimal place and try again
        if not wind_data:
            rounded_lat = round(float(latitude), 1)
            rounded_lon = round(float(longitude), 1)
            print(f"Retrying with rounded coordinates: {rounded_lat}, {rounded_lon}")

            wind_data = get_wind_data(rounded_lat, rounded_lon)

        # If still no data, generate random values within a realistic range
        if not wind_data:
            print(f"Generating random wind data for location {latitude}, {longitude}")

            wind_data = {
                "wind_speed": {random.randint(0, 50)},  # Wind speed in mph
                "wind_direction": {random.randint(0, 360)},  # Wind direction in degrees
                "temperature": random.randint(-10, 50),  # Temperature in °C
                "humidity": random.randint(10, 90)  # Humidity in %
            }

        # Update the document with wind data
        update_data = {
            "wind_speed": wind_data["wind_speed"],
            "wind_direction": wind_data["wind_direction"],
            "temperature": wind_data["temperature"],
            "humidity": wind_data["humidity"]
        }

        try:
            wildfire_coordinates.update_one(
                {"_id": doc["_id"]},
                {"$set": update_data}
            )
            print(f"Updated data for location {latitude}, {longitude}")
        except Exception as e:
            print(f"Failed to update coordinate at {latitude}, {longitude}: {e}")



# Reset the database and add coordinates to MongoDB
print("UPDATING MONGO DB")
reset_and_add_wildfire_coords()

# Fetch and add wind data for all documents in the MongoDB collection
print("UPDATING MONGO DB WITH WIND DATA")
add_wind_data_to_documents()
