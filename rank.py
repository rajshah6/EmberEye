import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from fastai.vision.all import *

# MongoDB setup
uri = "mongodb+srv://doctormali123:N14h8jnPvQF1Io5G@map.wakq4.mongodb.net/?appName=Map"
client = MongoClient(uri, server_api=ServerApi('1'))

# Flask setup
app = Flask(__name__)
CORS(app)

#username and passwords
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
        print(f"added with ID: {result.inserted_id}")
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

#can be changed to add in markers for wildfires
@app.route('/predict', methods=['POST'])
def predict():
    location = json.loads(request.form['location'])

    add_coord(location)
    return jsonify({
        'predicted_class': "test"
    })

#get all wildfire markers
@app.route('/wildfires', methods=['GET'])
def get_wildfires():
    try:
        wildfire = list(wildfire_coordinates.find({}))  # No filter for disaster type here
        for d in wildfire:
            d['_id'] = str(d['_id'])  # Convert _id to string
        return jsonify(wildfire), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Main entry point
if __name__ == '__main__':
    app.run(debug=True)
