

# Inspiration
- UN Development Goal #13: Climate Action
- When we focused on this goal, we wanted to provide a unique method of providing climate action through intelligent data collection.
- Google recently launched the first satellite of its FireSat constellation, designed to detect wildfires using advanced infrared sensors and AI. With plans to deploy over 50 satellites by 2030, FireSat aims to identify fires as small as 5x5 meters within minutes. While this is a groundbreaking step in wildfire detection, it comes with a massive budget. Inspired by this innovation, we set out to develop a more affordable AI-driven approach to wildfire monitoring.

# How We Built It
![Flowchart](https://media-hosting.imagekit.io//b224578219d4499d/Simple_Flowchart_Infographic_Graph.webp?Expires=1837305459&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=ZLL0zs2qcd1FF456TVS8PIZcbIs19oPaaDqo7gFH6qfhoK~ZqYfp0ZhVN1HsrxB7sChNvYiSsSe0iTk7QHocMHenGfOT9XjCKdcJ6VdD3DK5B2oYiTBqXpOfnF7gKWtApgeEuDcHKyo~WT~WBZoOFCCPpgSlvcW4up5bTH5WOKx9onnLBlw0hTK2ptutWaOSl2iUYECAkYgEKSKwQOl6ftXEXocA8YVMPXsP0W7wfDWNk2WLAyrcyshwNeQoq-lefG1xvSzLl2zvyTM4QnlezQ4EFx5Grwsl~7Tqe~Ty59bGxXmBR5AqkXpvJNNathvUxbFIDXtw67JhtTllzpnSrA__)


<p align="center">
  <img src="https://github.com/user-attachments/assets/01255fd7-a329-48b0-9c66-269465723d48" alt="image">
</p>


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

# What We Learned
Data Handling: Learned to efficiently manage large datasets (e.g., 28,000 data points) and optimize front-end rendering by reducing data load.

API Integration: Gained experience integrating multiple APIs (FIRMS, OpenWeatherMap) for real-time data collection and usage in applications.

AI Model Utilization: Explored using Cohere and Gemini for generating insights and predicting wildfire behavior, understanding how to tailor AI prompts for better results.

Frontend Performance Optimization: Optimized React app for performance by focusing on a subset of data and employing efficient rendering techniques.

Backend Automation: Implemented automated background tasks (APScheduler) to ensure data is up-to-date without manual intervention, learning about task scheduling and its challenges.

User Interface Design: Learned the importance of minimalist design principles combined with animations to enhance user experience.

Security & Best Practices: Emphasized securing sensitive data through environment variables and optimized database queries for system stability.

Collaboration & Time Management: Learned how dividing tasks between team members (front-end, data gathering, server management) led to efficient development and problem-solving.

# What's Next
What's Next for Perch
- Expanded Input Support: Enable users to upload a variety of file types, including videos, PDFs, and other formats, to enhance the types of content that can be analyzed and processed.

- Multi-language and Accent Support: Expand the system's capabilities to support more languages and accents, making the platform more inclusive and adaptable for global users.

