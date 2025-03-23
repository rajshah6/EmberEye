# Inspiration
- UN Development Goal #13: Climate Action
- When we focused on this goal, we wanted to provide a unique method of providing climate action through intelligent data collection.

# How We Built It

## FIRMS (Fire Information for Resource Management System)
- NASA’s API detects heat signatures via satellite imagery
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

# Challenges  We Ran Into
- The vast amount of data collected from FIRMS was intended to be displayed on the Map GUI. However, the front-end React application could not accommodate all 28,000 data points, so we opted for approximately 1,000 data points instead.

- One of our original ideas for the map GUI was to calculate the spread of each wildfire and display it on the map. However, this would require thousands of API requests to Gemini, which was not feasible within our budget. Instead, we decided to only show the spread of a wildfire if the user requests it for a specific marker.

- The selection and configuration of the LLM model were also challenging, requiring trial and error when testing prompts to generate accurate descriptions of wildfires based on the collected data and the spread depicted on the map. Since Cohere and Gemini were utilized, different strategies in prompts were employed to configure each LLM.

# Accomplishments That We're Proud Of
The minimalist design of the graphical user interface (GUI), combined with smooth animations, makes the front-end program aesthetically pleasing and appealing to a broad range of users.

The data gathered from the OpenWeatherMap API serves as a solid foundation for the large language models (LLMs) to generate decisions and predictions regarding wildfires. Specifically, this data is closely related to wildfire conditions, including rainfall and cloudiness.

Speed was one of our team's strengths in this project. By dividing the work between front-end development, data gathering, and web server management in Python, we created a great synergy that allowed us to spend more time debugging and refining our project.


