import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocation, Link, useNavigate } from "react-router-dom";
import "../styles/customScrollbar.css";

const mapStyles = {
  mapContainer: {
    width: "100%",
    height: "100%",
    borderLeft: "1px solid #374151",
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
};

const IntroductionPage = () => {
  const [wildfires, setWildfires] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isAddingMarkers, setIsAddingMarkers] = useState(false);
  const [visibleMarkerCounts, setVisibleMarkerCounts] = useState({
    wildfires: 0,
  });
  const [isSpreadLoading, setIsSpreadLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [closestWildfire, setClosestWildfire] = useState(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const spreadLayersRef = useRef([]);
  const markerDataRef = useRef({ wildfires: [] });
  const visibleBoundsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [showAllWildfires, setShowAllWildfires] = useState(false);

  mapboxgl.accessToken =
    "pk.eyJ1IjoiYXVta2FybWFsaSIsImEiOiJjbTNydmViNWYwMDEwMnJwdnhra3lqcTdiIn0.uENwb1XNsjEY1Y9DUWwslw";

  const fetchWildfires = async () => {
    try {
      const response = await fetch(
        "https://genesisw23-5c5848ef2953.herokuapp.com/wildfires"
      );
      if (!response.ok) throw new Error("Failed to fetch wildfires");
      const data = await response.json();
      setWildfires(data);
      markerDataRef.current.wildfires = data;
    } catch (error) {
      console.error("Error fetching wildfires:", error);
    }
  };

  const isInBounds = (location) => {
    if (
      !visibleBoundsRef.current ||
      !location ||
      !Array.isArray(location) ||
      location.length !== 2
    ) {
      return false;
    }

    const [lng, lat] = location;

    if (
      typeof lng !== "number" ||
      typeof lat !== "number" ||
      isNaN(lng) ||
      isNaN(lat) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return false;
    }

    return visibleBoundsRef.current.contains([lng, lat]);
  };

  const fetchSpreadData = async () => {
    if (!mapRef.current || !selectedMarker) return;

    setIsSpreadLoading(true);
    try {
      // Send all the data of the selected marker to the API
      const response = await fetch(
        "https://genesisw23-5c5848ef2953.herokuapp.com/get_red_spread",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: selectedMarker.location,
            temperature: selectedMarker.temperature,
            humidity: selectedMarker.humidity,
            wind_speed: selectedMarker.wind_speed,
            wind_direction: selectedMarker.wind_direction,
            rain: selectedMarker.rain,
            clouds: selectedMarker.clouds,
            wind_gust: selectedMarker.wind_gust,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch spread data");

      const data = await response.json();

      // Remove previous spread layers
      spreadLayersRef.current.forEach((layerId) => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.removeLayer(layerId);
        }
        if (mapRef.current.getSource(layerId)) {
          mapRef.current.removeSource(layerId);
        }
      });
      spreadLayersRef.current = [];

      // Add new spread point as a circular area
      if (data.latitude && data.longitude) {
        const spreadPointId = `spread-point-${Date.now()}`;
        const spreadAreaId = `spread-area-${Date.now()}`;

        // Create a source for the center point
        mapRef.current.addSource(spreadPointId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [data.longitude, data.latitude],
            },
            properties: {
              description: "Spread Point",
            },
          },
        });

        // Create a source for the spread area
        mapRef.current.addSource(spreadAreaId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [data.longitude, data.latitude],
            },
          },
        });

        // Add a large circle to represent the spread area
        mapRef.current.addLayer({
          id: spreadAreaId,
          type: "circle",
          source: spreadAreaId,
          paint: {
            // Convert spread_radius to pixels using the proper scale
            // Assuming spread_radius is in meters, we need to adjust based on zoom level
            "circle-radius": {
              base: 2,
              stops: [
                [0, 0],
                [7, data.spread_radius / 100],
                [10, data.spread_radius / 30],
                [15, data.spread_radius / 10],
                [20, data.spread_radius / 2],
              ],
            },
            "circle-color": "#de8162",
            "circle-opacity": 0.3,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FF0000",
            "circle-stroke-opacity": 0.6,
          },
        });

        // Add a small point for the center
        mapRef.current.addLayer({
          id: spreadPointId,
          type: "circle",
          source: spreadPointId,
          paint: {
            "circle-radius": 5,
            "circle-color": "#de8162",
            "circle-opacity": 0.8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#FFFFFF",
          },
        });

        spreadLayersRef.current.push(spreadPointId, spreadAreaId);

        // Fly to the new point with appropriate zoom level to see the spread
        mapRef.current.flyTo({
          center: [data.longitude, data.latitude],
          zoom: 12,
          speed: 1.5,
        });
      }
      setShowPopup(false);
    } catch (error) {
      console.error("Error fetching spread data:", error);
    } finally {
      setIsSpreadLoading(false);
    }
  };

  const addMarkers = () => {
    if (!mapRef.current || isAddingMarkers) return;

    setIsAddingMarkers(true);
    visibleBoundsRef.current = mapRef.current.getBounds();

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    let visibleWildfires = 0;

    const addMarkersInBatches = async (data) => {
      const markersToAdd = data.filter((item) => {
        if (
          !item.location ||
          !Array.isArray(item.location) ||
          item.location.length !== 2
        ) {
          return false;
        }

        const [lng, lat] = item.location;

        if (
          typeof lng !== "number" ||
          typeof lat !== "number" ||
          isNaN(lng) ||
          isNaN(lat) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          console.warn("Invalid coordinates:", item.location);
          return false;
        }

        return isInBounds(item.location);
      });

      visibleWildfires = markersToAdd.length;

      const batchSize = 100;
      const batches = Math.ceil(markersToAdd.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, markersToAdd.length);
        const batch = markersToAdd.slice(start, end);

        batch.forEach((item) => {
          const [longitude, latitude] = item.location;

          try {
            const marker = new mapboxgl.Marker({ color: "#FF0000" })
              .setLngLat([longitude, latitude])
              .addTo(mapRef.current);

            marker.getElement().addEventListener("click", () => {
              setSelectedMarker({
                ...item,
                markerType: "wildfire",
              });
              setShowPopup(true);
            });

            markersRef.current.push(marker);
          } catch (error) {
            console.error("Error adding marker:", error, item);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    addMarkersInBatches(markerDataRef.current.wildfires)
      .then(() => {
        setIsAddingMarkers(false);
        setVisibleMarkerCounts({ wildfires: visibleWildfires });
      })
      .catch((error) => {
        console.error("Error adding markers:", error);
        setIsAddingMarkers(false);
      });
  };

  const initializeMap = (longitude = 0, latitude = 0, zoom = 2) => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", async () => {
      mapRef.current = map;
      setMapLoaded(true);

      if (longitude !== 0 || latitude !== 0) {
        new mapboxgl.Marker({ color: "#60A5FA" })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText("Your Location"))
          .addTo(map);
      }

      await fetchWildfires();
      addMarkers();
    });

    map.on("moveend", () => {
      if (!isAddingMarkers) {
        addMarkers();
      }
    });

    map.on("zoomend", () => {
      if (!isAddingMarkers) {
        addMarkers();
      }
    });
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          initializeMap(longitude, latitude, 14);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(
            "Unable to get your location. Please ensure location services are enabled."
          );
          initializeMap();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      initializeMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && wildfires.length > 0) {
      markerDataRef.current = { wildfires };
      if (!isAddingMarkers) {
        addMarkers();
      }
    }
  }, [wildfires, mapLoaded]);

  // Add this effect to find the closest wildfire when data is available
  useEffect(() => {
    if (currentLocation && wildfires.length > 0) {
      findClosestWildfire();
    }
  }, [currentLocation, wildfires]);

  // Update danger calculation periodically to account for changing conditions
  useEffect(() => {
    if (closestWildfire) {
      const intervalId = setInterval(() => {
        findClosestWildfire();
      }, 60000); // Recalculate every minute
      
      return () => clearInterval(intervalId);
    }
  }, [closestWildfire]);

  const formatCoordinates = (location) => {
    if (!Array.isArray(location) || location.length !== 2) {
      return "N/A";
    }

    const [longitude, latitude] = location;

    const latDirection = latitude >= 0 ? "N" : "S";
    const longDirection = longitude >= 0 ? "E" : "W";

    // Format with 4 decimal places and appropriate direction indicators
    return `${Math.abs(longitude).toFixed(4)}° ${longDirection}, ${Math.abs(
      latitude
    ).toFixed(4)}° ${latDirection}`;
  };

  const MarkerPopup = () => {
    const [aiDescription, setAiDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!selectedMarker || !showPopup) return null;

    const isWildfire = selectedMarker.markerType === "wildfire";
    const headerColor = isWildfire ? "bg-gray-800" : "bg-red-800";

    const fetchCohereData = async () => {
      try {
        setIsLoading(true);
        setError("");
        setAiDescription("");

        const response = await fetch("https://api.cohere.ai/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ExsK01ja38y8hutQyEYh9ymJzsVSa5ig1DgscgzY`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "command",
            prompt: `Generate insights for ${selectedMarker.location} which is a heat anomaly detected by NASA assumed to be a wildfire. Some more information about it is ${selectedMarker.temperature}°C, humidity: ${selectedMarker.humidity}%, wind speed: ${selectedMarker.wind_speed} m/s, wind direction: ${selectedMarker.wind_direction}°, rain ${selectedMarker.rain}mm and clouds ${selectedMarker.clouds}%. Strictly speak about the details about the wildfire in that area. Keep the length 3-5 sentences.`,
            max_tokens: 150,
          }),
        });

        const data = await response.json();
        if (data && data.text) {
          setAiDescription(data.text);
        } else {
          setError("No insights generated");
        }
      } catch (error) {
        setError("Failed to generate insights");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-700">
          <div
            className={`flex justify-between items-start mb-4 -m-6 p-4 ${headerColor} rounded-t-lg`}
          >
            <h3 className="text-xl font-bold text-white">Wildfire Analysis</h3>
            <button
              onClick={() => setShowPopup(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="text-gray-300 mb-4 mt-6">
            <div className="mb-4 bg-gray-700 p-3 rounded-lg">
              <h4 className="text-lg font-semibold mb-2 text-white">
                AI Insights
              </h4>
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : aiDescription ? (
                <div className="text-gray-200 whitespace-pre-wrap">
                  {aiDescription}
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating insights...
                </div>
              ) : (
                <p className="text-gray-400">
                  Click "Generate Insights" for AI analysis
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Location:</strong>{" "}
                  {formatCoordinates(selectedMarker.location)}
                </p>
                <p className="mt-2">
                  <strong>Temperature:</strong> {selectedMarker.temperature}°C
                </p>
                <p className="mt-2">
                  <strong>Humidity:</strong> {selectedMarker.humidity}%
                </p>
              </div>
              <div>
                <p>
                  <strong>Wind Speed:</strong> {selectedMarker.wind_speed} m/s
                </p>
                <p className="mt-2">
                  <strong>Wind Gust:</strong> {selectedMarker.wind_gust} m/s
                </p>
                <p className="mt-2">
                  <strong>Wind Direction:</strong>{" "}
                  {selectedMarker.wind_direction}°
                </p>
                <p className="mt-2">
                  <strong>Rain:</strong> {selectedMarker.rain}mm
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p>
                <strong>Cloud Cover:</strong> {selectedMarker.clouds}%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchCohereData}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={isLoading}
            >
              {aiDescription ? "Regenerate" : "Generate Insights"}
            </button>
            <button
              onClick={fetchSpreadData}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={isSpreadLoading}
            >
              {isSpreadLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Spreading...
                </div>
              ) : (
                "Spread"
              )}
            </button>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateDangerPercentage = (wildfire) => {
    if (!wildfire || !currentLocation) return 0;
    
    // Extract relevant factors
    const distance = wildfire.distance || 0; // km
    const temperature = wildfire.temperature || 0; // °C
    const windSpeed = wildfire.wind_speed || 0; // m/s
    const humidity = wildfire.humidity || 0; // %
    const cloudCover = wildfire.clouds || 0; // %
    
    // Set weight for each factor
    const weights = {
      distance: 0.4,   // 40% - most important factor
      temperature: 0.2, // 20%
      windSpeed: 0.2,   // 20%
      humidity: 0.1,    // 10%
      cloudCover: 0.1   // 10%
    };
    
    // Normalize each factor to a 0-100 scale
    // Distance (closer = more dangerous, max consideration 50km)
    const distanceScore = Math.max(0, 100 - (distance * 2));
    
    // Temperature (higher = more dangerous, consider 0-50°C range)
    const temperatureScore = Math.min(100, (temperature / 50) * 100);
    
    // Wind Speed (higher = more dangerous, consider 0-30 m/s range)
    const windSpeedScore = Math.min(100, (windSpeed / 30) * 100);
    
    // Humidity (lower = more dangerous)
    const humidityScore = Math.max(0, 100 - humidity);
    
    // Cloud Cover (lower = more dangerous)
    const cloudCoverScore = Math.max(0, 100 - cloudCover);
    
    // Calculate weighted score
    const dangerScore = (
      weights.distance * distanceScore +
      weights.temperature * temperatureScore +
      weights.windSpeed * windSpeedScore +
      weights.humidity * humidityScore +
      weights.cloudCover * cloudCoverScore
    );
    
    // Return rounded percentage
    return Math.round(dangerScore);
  };

  const findClosestWildfire = () => {
    if (!currentLocation || !wildfires.length) return;

    let closest = null;
    let minDistance = Infinity;

    wildfires.forEach((wildfire) => {
      if (wildfire.location && Array.isArray(wildfire.location)) {
        const [longitude, latitude] = wildfire.location;
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          latitude,
          longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          closest = { ...wildfire, distance };
        }
      }
    });

    setClosestWildfire(closest);
    return closest;
  };

  const navigateToClosestWildfire = () => {
    const closest = findClosestWildfire();
    if (closest && mapRef.current) {
      const [longitude, latitude] = closest.location;
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        speed: 1.5,
        essential: true
      });

      // Show popup after animation
      const handleMoveEnd = () => {
        setSelectedMarker({
          ...closest,
          markerType: "wildfire",
        });
        setShowPopup(true);
        mapRef.current.off("moveend", handleMoveEnd);
      };

      mapRef.current.on("moveend", handleMoveEnd);
    }
  };

  return (
    <div className="flex h-screen overflow-auto bg-gray-900">
      {/* Sidebar */}
      <div className="w-1/3 p-8 flex flex-col h-full overflow-y-auto">
        {/* Header section */}
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold mb-4 text-white">
            Welcome {username}!
          </h1>
          <p className="text-lg mb-4 text-gray-300">
            This is where the content goes.
          </p>

          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-red-600 transition duration-200"
            >
              Log Out
            </button>
            {currentLocation && (
              <button
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.flyTo({
                      center: [currentLocation.longitude, currentLocation.latitude],
                      zoom: 14,
                      speed: 1.5,
                    });
                  }
                }}
                className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-600 transition duration-200"
              >
                Return to My Location
              </button>
            )}
          </div>

          <div className="mt-4">
            {currentLocation && closestWildfire && (
              <button
                onClick={navigateToClosestWildfire}
                className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-orange-600 transition duration-200 flex items-center"
              >
                <span className="mr-2">🔥</span>
                Find Closest Wildfire ({closestWildfire.distance.toFixed(1)} km)
              </button>
            )}
          </div>

          {locationError && (
            <p className="text-red-400 mt-2">{locationError}</p>
          )}
        </div>

        {/* Scrollable wildfire list */}
        <div className="flex-grow mt-6 text-gray-300 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold mb-2">Wildfires Near You</h2>
          <p className="text-sm text-gray-400 mb-2">
            Total: {wildfires.length} | Visible: {visibleMarkerCounts.wildfires}
          </p>
          <ul className="space-y-2 pr-2">
            {(showAllWildfires ? wildfires : wildfires.slice(0, 10)).map(
              (wildfire, index) => (
                <li
                  key={`wildfire-${index}`}
                  className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition"
                  onClick={() => {
                    if (
                      wildfire.location &&
                      Array.isArray(wildfire.location) &&
                      wildfire.location.length === 2
                    ) {
                      const [longitude, latitude] = wildfire.location;

                      // Fly to the location
                      mapRef.current.flyTo({
                        center: [longitude, latitude],
                        zoom: 12,
                        speed: 1.5,
                      });

                      // Add a listener to show the popup after the map animation ends
                      const handleMoveEnd = () => {
                        setSelectedMarker({
                          ...wildfire,
                          markerType: "wildfire",
                        });
                        setShowPopup(true);

                        // Remove the event listener after it's triggered
                        mapRef.current.off("moveend", handleMoveEnd);
                      };

                      mapRef.current.on("moveend", handleMoveEnd);
                    } else {
                      console.warn(
                        "Invalid wildfire location:",
                        wildfire.location
                      );
                    }
                  }}
                >
                  <p>
                    <strong>Location:</strong>{" "}
                    {formatCoordinates(wildfire.location)}
                  </p>
                </li>
              )
            )}
            {!showAllWildfires && wildfires.length > 10 && (
              <li
                className="p-2 bg-gray-800 rounded text-center cursor-pointer hover:bg-gray-700 transition"
                onClick={() => setShowAllWildfires(true)}
              >
                View More ({wildfires.length - 10} more)
              </li>
            )}
            
            {closestWildfire && (
              <li 
                className="p-4 mt-4 bg-gray-800 rounded hover:bg-gray-700 transition cursor-pointer" 
                onClick={() => navigateToClosestWildfire()}
                title="Click to view this wildfire"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">Closest Wildfire Risk Level</h3>
                  <div className="flex items-center">
                    <span className="text-white font-bold mr-2">
                      {calculateDangerPercentage(closestWildfire)}%
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        findClosestWildfire();
                      }}
                      className="p-1 rounded hover:bg-gray-700 transition"
                      title="Refresh risk assessment"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="h-4 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${calculateDangerPercentage(closestWildfire)}%`,
                      background: `linear-gradient(90deg, 
                        rgb(34, 197, 94) 0%, 
                        rgb(250, 204, 21) 50%, 
                        rgb(239, 68, 68) 100%)`,
                      backgroundSize: '300% 100%',
                      backgroundPosition: `${100 - calculateDangerPercentage(closestWildfire)}% 0`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Low Risk</span>
                  <span>Moderate</span>
                  <span>High Risk</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-300">
                    {calculateDangerPercentage(closestWildfire) < 30 ? 
                      "Low risk. Monitor for changes." :
                      calculateDangerPercentage(closestWildfire) < 70 ?
                        "Moderate risk. Stay informed." :
                        "High risk. Be prepared to evacuate."
                    }
                  </p>
                  <span className="text-xs text-blue-400">{closestWildfire.distance.toFixed(1)} km away</span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {isAddingMarkers && (
          <div className="fixed bottom-4 left-4 bg-blue-900 text-white px-4 py-2 rounded-lg">
            Loading markers...
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="w-2/3 h-full relative">
        <div
          ref={mapContainerRef}
          style={{ ...mapStyles.absoluteFill, ...mapStyles.mapContainer }}
        />
        <MarkerPopup />
      </div>
    </div>
  );
};

export default IntroductionPage;
