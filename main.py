import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from google import genai
from updateDB import add_metadata_to_documents

# MongoDB setup
uri = os.environ.get('MONGO_API')
client = MongoClient(uri, server_api=ServerApi('1'))

# Flask setup
app = Flask(__name__)
CORS(app)

# Username and passwords
db = client["user_data"]
collection = db["data"]
wildfire_coordinates = db["wildfire_coord"]

# User management functions
def add_user(username, password):
    user_data = {
        "username": username,
        "password": password
    }
    try:
        result = collection.insert_one(user_data)
        print(f"User added with ID: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to insert user: {e}")

def add_coord(location):
    data = {
        "location": location
    }
    try:
        result = wildfire_coordinates.insert_one(data)
        print(f"Added with ID: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to insert user: {e}")

# Routes
@app.route('/')
def index():
    return "Backend"

@app.route('/api/data', methods=['POST'])
def add_user_route():
    data = request.get_json()
    un = data.get('username')
    ps = data.get('password')

    add_user(username=un, password=ps)

    return jsonify({"message": "User added successfully"}), 201

@app.route('/api/check', methods=['POST'])
def check_user():
    data = request.get_json()
    un = data.get('username')
    ps = data.get('password')

    user = collection.find_one({"username": un})

    if user:
        if user["password"] == ps:
            return jsonify({"exists": True}), 200
        else:
            return jsonify({"exists": False, "message": "Incorrect password"}), 401
    else:
        return jsonify({"exists": False, "message": "Username not found"}), 404

# Get all wildfire markers
@app.route('/wildfires', methods=['GET'])
def get_wildfires():
    try:
        wildfire = list(wildfire_coordinates.find({}))
        for d in wildfire:
            d['_id'] = str(d['_id'])  # Convert _id to string
        return jsonify(wildfire), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

client = genai.Client(api_key=os.environ.get('GEMINI'))

@app.route('/get_red_spread', methods=['POST'])
def get_red_spread():
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No wildfire data provided'}), 400

        location = data.get('location')
        if not location or len(location) != 2:
            return jsonify({'error': 'Invalid location data'}), 400

        lon, lat = location
        temperature = data.get('temperature', 0)
        humidity = data.get('humidity', 50)
        wind_speed = data.get('wind_speed', 0)
        wind_direction = data.get('wind_direction', 0)
        wind_gust = data.get('wind_gust', 0)
        rain = data.get('rain', 0)
        clouds = data.get('clouds', 0)

        prompt = f"""
        You are a wildfire spread prediction model. Calculate a realistic spread radius in meters 
        for a wildfire at coordinates [{lat}, {lon}] with the following conditions:

        - Temperature: {temperature}°C
        - Humidity: {humidity}%
        - Wind speed: {wind_speed} m/s
        - Wind direction: {wind_direction}°
        - Wind gust: {wind_gust} m/s
        - Rainfall: {rain}mm
        - Cloud cover: {clouds}%

        Respond with only a JSON object containing a single field 'spread_radius' with a value in meters.
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        response_text = response.text
        spread_radius = None

        try:
            import json
            result = json.loads(response_text)
            spread_radius = result.get('spread_radius', 1000)
        except json.JSONDecodeError:
            import re
            match = re.search(r'(\d+)', response_text)
            if match:
                spread_radius = int(match.group(1))

        if spread_radius is None:
            spread_radius = 1000

        print(spread_radius)

        return jsonify({
            'latitude': lat,
            'longitude': lon,
            'spread_radius': spread_radius
        }), 200

    except Exception as e:
        print(f"Error in get_red_spread: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
