import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from google import genai
from updateDB import reset_and_add_wildfire_coords, add_metadata_to_documents
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta  # Add this import



# MongoDB setup
uri = os.environ.get('MONGO_API')
client = MongoClient(uri, server_api=ServerApi('1'))

# Flask setup
app = Flask(__name__)
CORS(app)

# username and passwords
db = client["user_data"]
collection = db["data"]
wildfire_coordinates = db["wildfire_coord"]

scheduler = BackgroundScheduler()

def run_update_job():
    print("Starting database update...")
    reset_and_add_wildfire_coords()
    add_metadata_to_documents()
    print("Database update completed.")

# Schedule first run 24 hours from now, then every 24 hours
start_date = datetime.now() + timedelta(hours=24)
scheduler.add_job(
    run_update_job,
    'interval',
    hours=24,
    start_date=start_date  # Delay first execution
)
scheduler.start()


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


# get all wildfire markers
@app.route('/wildfires', methods=['GET'])
def get_wildfires():
    try:
        wildfire = list(wildfire_coordinates.find({}))  # No filter for disaster type here
        for d in wildfire:
            d['_id'] = str(d['_id'])  # Convert _id to string
        return jsonify(wildfire), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


client = genai.Client(api_key=os.environ.get('GEMINI'))


@app.route('/get_red_spread', methods=['POST'])
def get_red_spread():
    try:
        # Get data from the request body
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No wildfire data provided'}), 400

        # Extract location coordinates
        location = data.get('location')
        if not location or len(location) != 2:
            return jsonify({'error': 'Invalid location data'}), 400

        lon, lat = location  # Frontend sends [longitude, latitude]

        # Extract environmental data
        temperature = data.get('temperature', 0)
        humidity = data.get('humidity', 50)
        wind_speed = data.get('wind_speed', 0)
        wind_direction = data.get('wind_direction', 0)
        wind_gust = data.get('wind_gust', 0)
        rain = data.get('rain', 0)
        clouds = data.get('clouds', 0)

        # Create the prompt
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

        The Rate of Spread (ROS) can be estimated using:

        ROS = R₀ × e^(aT + bW + cG - dH - eR - fC)

        Where:

        R₀ = Base rate of spread (depends on fuel type, typically derived from historical data).
        T = Temperature (°C).
        W = Wind speed (km/h).
        G = Wind gust speed (km/h).
        H = Relative humidity (%).
        R = Rainfall (mm).
        C = Cloud cover (%).
        a, b, c, d, e, f = Empirical coefficients.

        Make some large coefficients and calculate the ROS. This will be the spread_radius.

        Respond with only a JSON object containing a single field 'spread_radius' with a value in meters.
        For example: {{"spread_radius": 1500}}.
        """

        # Generate content using Gemini
        response = client.models.generate_content(
            model="gemini-2.0-flash",  # Use the appropriate Gemini model
            contents=prompt
        )

        # Parse the response
        response_text = response.text
        spread_radius = None

        try:
            import json
            result = json.loads(response_text)
            spread_radius = result.get('spread_radius', 1000)
        except json.JSONDecodeError:
            # Fallback to extract just the number if JSON parsing fails
            import re
            match = re.search(r'(\d+)', response_text)
            if match:
                spread_radius = int(match.group(1))

        # If no spread_radius is found, set a default
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

# Main entry point
if __name__ == '__main__':
    app.run(debug=True)
