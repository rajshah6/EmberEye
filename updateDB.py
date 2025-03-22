import requests
import csv
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

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

        fire_locations = [(row["longitude"], row["latitude"]) for row in reader if "latitude" in row and "longitude" in row]
        return fire_locations  # Return all locations
    else:
        print(f"Error fetching data: {response.status_code}")
        return []

def get_wind_data(lat, lon):
    OPENWEATHER_API_KEY = "YOUR_API_KEY_HERE"  # Replace with your OpenWeatherMap API key
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
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

        # Fetch the wind data for each latitude/longitude
        wind_data = get_wind_data(latitude, longitude)

        if wind_data:
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
        else:
            print(f"Could not fetch wind data for location {latitude}, {longitude}")

# Reset the database and add coordinates to MongoDB
print("UPDATING MONGO DB")
reset_and_add_wildfire_coords()

# Fetch and add wind data for all documents in the MongoDB collection
print("UPDATING MONGO DB WITH WIND DATA")
add_wind_data_to_documents()