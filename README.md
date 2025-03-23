TECHNOLOGY STACK

his project's various frameworks and complete stack highlight efficiency, logical data gathering, and computation practices. A flowchart has been attached to illustrate which project components utilize specific tools. Firstly, let us begin with the most important aspect of this project: the storage of data related to wildfires, along with the tools, frameworks, and libraries employed.

FIRMS (Fire Information for Resource Management System): NASA provides an API service to track heat signatures detected by satellite imagery, which are highly indicative of potential wildfire locations. This service offers hundreds of coordinates on Earth where wildfires are present, represented as latitude and longitude. It is important to note that when specific wildfires are selected by the front-end program, it is these collected longitude and latitude values that help define a particular wildfire. Additionally, this data is updated frequently in real-time, providing an efficient and effective representation of global wildfires.

OpenWeatherMap API: After receiving the coordinates for each wildfire, we need a resource to gather the topological and geographical data for those specific coordinates. This is where the One Call API 3.0 comes into play, providing us with information on cloudiness, humidity, precipitation, temperature, wind direction, wind speed, and wind gusts in the vicinity of the wildfire. This data is incredibly valuable, as it not only provides context for the situation in that area but also allows for predictions about the wildfire's behavior.



