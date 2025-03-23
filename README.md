# How We Built It

## FIRMS (Fire Information for Resource Management System)
- NASA’s API detects heat signatures via satellite imager
- Provides real-time wildfire locations (latitude and longitude)
- Front end selects specific wildfires using these coordinates

## OpenWeatherMap API
- Gathers weather and geographical data for wildfire locations
- Provides data on cloudiness, humidity, precipitation, temperature, and wind conditions
- Helps predict wildfire behavior using real-time environmental factors

## AI Models Integration
- **Cohere**: Generates insights on wildfires by analyzing locations and environmental data
- **Gemini**: Estimates the predicted radius and spread of wildfires using real-time data

## Database (MongoDB)
- Stores wildfire data (1000+ documents)
- Includes location data, weather, and user info
- NoSQL design for efficient data retrieval by backend

## Front End (React, Tailwind, Vite)
- Minimalist design with React, styled using Tailwind CSS
- Login page built with JavaScript
- Deployed on Vercel

## Backend (Flask, MongoDB, APScheduler)
- Built with Python, Flask, and MongoDB
- Handles user authentication, data storage, and updates
- Uses APScheduler for automated data updates (every 24 hours)
- Initial delay for the first update

## Automation & Data Updates
- Background task scheduler updates wildfire and weather data
- 24-hour delay after the app starts for the first update

## Security & Performance
- Environment variables store sensitive data (API keys, DB URIs)
- Optimized queries for performance
- Error handling for system stability

## Wildfire Spread Analysis
- Analyzes factors (wind, humidity, temperature) to predict fire spread
- AI-based computation for accurate predictions
