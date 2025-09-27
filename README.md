

# Inspiration
- UN Development Goal #13: Climate Action
- When we focused on this goal, we wanted to provide a unique method of providing climate action through intelligent data collection.

# How We Built It

![7413de06-98a4-4e26-8bcc-420766117620](https://github.com/user-attachments/assets/ec7204e8-d36a-4039-8d04-b06bc20c2f8b)

## FIRMS (Fire Information for Resource Management System)

* NASA’s API detects heat signatures via satellite imagery
* Provides real-time wildfire coordinates
* Front end selects specific wildfires by coordinates

## OpenWeatherMap API

* Gathers weather data (cloudiness, humidity, precipitation, temperature, wind)
* Helps predict wildfire behavior using real-time conditions

## AI Models Integration

* **Cohere**: Analyzes locations and environmental data to generate insights
* **Gemini**: Predicts wildfire spread and radius using real-time data

## Database (MongoDB)

* Stores 1000+ wildfire documents
* Includes location, weather, and user data
* NoSQL design for efficient backend queries

## Front End (React, Tailwind, Vite)

* Minimalist UI with smooth animations
* Login built with JavaScript
* Deployed on Vercel

## Backend (Flask, MongoDB, APScheduler)

* Handles authentication, data storage, and updates
* APScheduler automates daily updates (24-hour delay for first update)

## Automation & Data Updates

* Scheduler updates wildfire and weather data every 24 hours
* Initial 24-hour delay after startup

## Security & Performance

* API keys and DB URIs stored in environment variables
* Optimized queries for performance
* Robust error handling for stability

## Wildfire Spread Analysis

* Predicts spread using wind, humidity, temperature
* AI-based computation for accuracy

# What's Next

* **Expanded Input Support**: Add videos, PDFs, and more file types for analysis
* **Multi-language & Accent Support**: Improve inclusivity and global adaptability

[View on Devpost!](https://devpost.com/software/firecheck-s1tlf8)
