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

// Add custom animation keyframes
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes pulseSlow {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  .animate-fadein {
    animation: fadeIn 0.2s ease-out forwards;
  }
  
  .animate-pulse-slow {
    animation: pulseSlow 2s infinite ease-in-out;
  }
`;

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
  // Add new state for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredWildfires, setFilteredWildfires] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const searchRef = useRef(null); // Reference for the search container

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
      setFilteredWildfires(data);
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

      // Close the popup after loading the spread data
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
              // Fly to the marker location first
              mapRef.current.flyTo({
                center: [longitude, latitude],
                zoom: 12,
                speed: 1.5,
              });

              // Then show the popup after animation completes
              const handleMoveEnd = () => {
                setSelectedMarker({
                  ...item,
                  markerType: "wildfire",
                });
                setShowPopup(true);

                // Remove the event listener after it's triggered
                mapRef.current.off("moveend", handleMoveEnd);
              };

              mapRef.current.on("moveend", handleMoveEnd);
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

  // Extract unique countries when wildfires data is loaded
  useEffect(() => {
    if (wildfires.length > 0) {
      const uniqueCountries = [
        ...new Set(
          wildfires
            .filter((wildfire) => wildfire.country)
            .map((wildfire) => wildfire.country)
        ),
      ].sort();

      setAvailableCountries(uniqueCountries);
      setFilteredWildfires(wildfires);
    }
  }, [wildfires]);

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
    const headerColor = isWildfire
      ? "bg-gradient-to-r from-gray-800 to-gray-900"
      : "bg-gradient-to-r from-red-800 to-red-900";
    const dangerLevel = calculateDangerPercentage(selectedMarker);

    const fetchCohereData = async () => {
      try {
        setIsLoading(true);
        setError("");
        setAiDescription("");

        // Build location description using available location data
        const locationDesc =
          selectedMarker.country && selectedMarker.state
            ? `${selectedMarker.state}, ${selectedMarker.country}`
            : selectedMarker.country
            ? selectedMarker.country
            : selectedMarker.locationName || "this location";

        const response = await fetch("https://api.cohere.ai/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ExsK01ja38y8hutQyEYh9ymJzsVSa5ig1DgscgzY`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "command",
            prompt: `Generate insights for a wildfire detected in ${locationDesc}. This is a heat anomaly detected by NASA satellites. Environmental conditions: temperature: ${selectedMarker.temperature}°C, humidity: ${selectedMarker.humidity}%, wind speed: ${selectedMarker.wind_speed} m/s, wind direction: ${selectedMarker.wind_direction}°, rainfall: ${selectedMarker.rain}mm, cloud cover: ${selectedMarker.clouds}%. Provide details about potential wildfire behavior in this region given these conditions. Include notable geographical features or population centers that might be affected. Keep the response between 3-5 sentences.`,
            max_tokens: 150,
          }),
        });

        // Rest of the function remains the same
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
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 backdrop-blur-sm p-4">
        <div className="bg-gray-900 p-6 rounded-xl shadow-2xl w-full max-w-3xl mx-auto border border-gray-700 animate-fadein overflow-auto max-h-[95vh] my-2">
          <div
            className={`flex justify-between items-center mb-4 -m-6 p-4 ${headerColor} rounded-t-xl shadow-md`}
          >
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-red-500 mr-2 animate-pulse-slow"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12,23c-1.7,0-3-1.3-3-3c0-1.9,3-6,3-6s3,4.1,3,6C15,21.7,13.7,23,12,23z M17,10c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3 S17,11.7,17,10z M7,10c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3S7,11.7,7,10z M4,14c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3 S4,15.7,4,14z M12,2c0,0,3,4.1,3,6c0,1.7-1.3,3-3,3S9,9.7,9,8C9,6.1,12,2,12,2z" />
              </svg>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Wildfire Analysis
                </h3>
                {selectedMarker.country && selectedMarker.state && (
                  <p className="text-sm text-yellow-400">
                    {selectedMarker.state}, {selectedMarker.country}
                  </p>
                )}
                {selectedMarker.country && !selectedMarker.state && (
                  <p className="text-sm text-yellow-400">
                    {selectedMarker.country}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full p-1 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="text-gray-300 mb-4 mt-6">
            {/* Risk Level Indicator */}
            <div className="mb-6 bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-white">
                  Risk Assessment
                </h4>
                <span
                  className="text-white font-bold px-2 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor:
                      dangerLevel < 30
                        ? "rgba(34, 197, 94, 0.3)"
                        : dangerLevel < 70
                        ? "rgba(250, 204, 21, 0.3)"
                        : "rgba(239, 68, 68, 0.3)",
                    color:
                      dangerLevel < 30
                        ? "rgb(34, 197, 94)"
                        : dangerLevel < 70
                        ? "rgb(250, 204, 21)"
                        : "rgb(239, 68, 68)",
                  }}
                >
                  {dangerLevel}% Risk
                </span>
              </div>
              <div className="h-3 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dangerLevel}%`,
                    background: `linear-gradient(90deg, 
                      rgb(34, 197, 94) 0%, 
                      rgb(250, 204, 21) 50%, 
                      rgb(239, 68, 68) 100%)`,
                    backgroundSize: "300% 100%",
                    backgroundPosition: `${100 - dangerLevel}% 0`,
                  }}
                ></div>
              </div>
              <p className="mt-2 text-sm">
                {dangerLevel < 30
                  ? "Low risk. Monitor for changes."
                  : dangerLevel < 70
                  ? "Moderate risk. Stay informed."
                  : "High risk. Be prepared to evacuate."}
              </p>
            </div>

            {/* AI Insights Section */}
            <div className="mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-3 text-white flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Insights
              </h4>
              {error ? (
                <div className="text-red-400 p-3 bg-red-900/20 rounded-md flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              ) : aiDescription ? (
                <div className="text-gray-200 whitespace-pre-wrap p-3 bg-blue-900/10 rounded-md border border-blue-900/20">
                  {aiDescription}
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 p-6">
                  <svg
                    className="animate-spin h-6 w-6"
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
                  <span>Generating insights...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-700/30 rounded-md text-gray-400">
                  <svg
                    className="w-8 h-8 mb-2 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-center">
                    Click "Generate Insights" for AI analysis of this wildfire
                  </p>
                </div>
              )}
            </div>

            {/* Wildfire Details Section */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-3 text-white flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-orange-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Weather & Location Data
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm">
                        {formatCoordinates(selectedMarker.location)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Temperature</p>
                      <p className="text-sm">{selectedMarker.temperature}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Humidity</p>
                      <p className="text-sm">{selectedMarker.humidity}%</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-teal-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Wind Speed</p>
                      <p className="text-sm">{selectedMarker.wind_speed} m/s</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-indigo-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2s-.9-2-2-2h-2c0-2.76-2.24-5-5-5s-5 2.24-5 5H4c-1.1 0-2 .9-2 2zm13-3c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM7 9c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Wind Gust</p>
                      <p className="text-sm">{selectedMarker.wind_gust} m/s</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-blue-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Cloud Cover</p>
                      <p className="text-sm">{selectedMarker.clouds}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">Rainfall</p>
                  <p className="text-sm">{selectedMarker.rain}mm</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={fetchCohereData}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-200 flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {aiDescription ? "Regenerate" : "Generate Insights"}
            </button>
            <button
              onClick={fetchSpreadData}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all duration-200 flex items-center"
              disabled={isSpreadLoading}
            >
              {isSpreadLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Show Spread
                </>
              )}
            </button>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex-grow flex justify-center items-center"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
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
      distance: 0.4, // 40% - most important factor
      temperature: 0.2, // 20%
      windSpeed: 0.2, // 20%
      humidity: 0.1, // 10%
      cloudCover: 0.1, // 10%
    };

    // Normalize each factor to a 0-100 scale
    // Distance (closer = more dangerous, max consideration 50km)
    const distanceScore = Math.max(0, 100 - distance * 2);

    // Temperature (higher = more dangerous, consider 0-50°C range)
    const temperatureScore = Math.min(100, (temperature / 50) * 100);

    // Wind Speed (higher = more dangerous, consider 0-30 m/s range)
    const windSpeedScore = Math.min(100, (windSpeed / 30) * 100);

    // Humidity (lower = more dangerous)
    const humidityScore = Math.max(0, 100 - humidity);

    // Cloud Cover (lower = more dangerous)
    const cloudCoverScore = Math.max(0, 100 - cloudCover);

    // Calculate weighted score
    const dangerScore =
      weights.distance * distanceScore +
      weights.temperature * temperatureScore +
      weights.windSpeed * windSpeedScore +
      weights.humidity * humidityScore +
      weights.cloudCover * cloudCoverScore;

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
        essential: true,
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

  // Add this function to handle search filtering
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredWildfires(wildfires);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = wildfires.filter((wildfire) => {
      return (
        wildfire.country &&
        wildfire.country.toLowerCase().includes(lowercaseQuery)
      );
    });

    setFilteredWildfires(filtered);

    // If we have filtered results and a map reference, we can optionally adjust the map
    if (filtered.length > 0 && mapRef.current) {
      // Create a new bounds object
      const bounds = new mapboxgl.LngLatBounds();

      // Extend the bounds to include all filtered wildfires
      filtered.forEach((wildfire) => {
        if (
          wildfire.location &&
          Array.isArray(wildfire.location) &&
          wildfire.location.length === 2
        ) {
          bounds.extend(wildfire.location);
        }
      });

      // If we have valid bounds (i.e., at least one valid location), fit the map to those bounds
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10,
        });
      }
    }
  };

  // Add a function to handle selecting a country from suggestions
  const handleSelectCountry = (country) => {
    handleSearch(country);
    setShowCountrySuggestions(false); // Hide the suggestions after selection
  };

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowCountrySuggestions(false);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-auto bg-gray-900">
      {/* Apply custom animations */}
      <style>{animationStyles}</style>

      {/* Sidebar */}
      <div className="w-1/3 p-8 flex flex-col h-full overflow-y-auto">
        {/* Header section */}
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold mb-4 text-white">
            {!username ? "Welcome!" : `Welcome ${username}!`}
          </h1>
          <p className="text-lg mb-4 text-gray-300"></p>

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
                      center: [
                        currentLocation.longitude,
                        currentLocation.latitude,
                      ],
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

          {/* Search bar */}
          <div className="mt-4 relative" ref={searchRef}>
            <div className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by country..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowCountrySuggestions(true)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    handleSearch("");
                    setShowCountrySuggestions(false);
                  }}
                  className="ml-2 bg-gray-700 p-2 rounded-full hover:bg-gray-600 text-gray-300"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {availableCountries.length > 0 &&
              searchQuery &&
              showCountrySuggestions && (
                <div className="absolute z-10 mt-1 w-full bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto custom-scrollbar">
                  <div className="py-1">
                    {availableCountries
                      .filter((country) =>
                        country
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((country, idx) => (
                        <button
                          key={idx}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          onClick={() => handleSelectCountry(country)}
                        >
                          {country}
                        </button>
                      ))}
                  </div>
                </div>
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

        {/* Scrollable wildfire list - now using filteredWildfires instead of wildfires */}
        <div className="flex-grow mt-6 text-gray-300 overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold mb-2">Wildfires Near You</h2>
          <p className="text-sm text-gray-400 mb-2">
            Total: {wildfires.length} |
            {searchQuery ? ` Filtered: ${filteredWildfires.length} | ` : " "}
            Visible: {visibleMarkerCounts.wildfires}
          </p>
          <ul className="space-y-2 pr-2">
            {closestWildfire && !searchQuery && (
              <li
                className="p-4 mb-4 bg-gray-800 rounded hover:bg-gray-700 transition cursor-pointer"
                onClick={() => navigateToClosestWildfire()}
                title="Click to view this wildfire"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">
                    Closest Wildfire Risk Level
                    {closestWildfire.country && closestWildfire.state && (
                      <span className="text-sm ml-2 font-normal text-yellow-400">
                        ({closestWildfire.state}, {closestWildfire.country})
                      </span>
                    )}
                    {closestWildfire.country && !closestWildfire.state && (
                      <span className="text-sm ml-2 font-normal text-yellow-400">
                        ({closestWildfire.country})
                      </span>
                    )}
                  </h3>
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
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
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
                      backgroundSize: "300% 100%",
                      backgroundPosition: `${
                        100 - calculateDangerPercentage(closestWildfire)
                      }% 0`,
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
                    {calculateDangerPercentage(closestWildfire) < 30
                      ? "Low risk. Monitor for changes."
                      : calculateDangerPercentage(closestWildfire) < 70
                      ? "Moderate risk. Stay informed."
                      : "High risk. Be prepared to evacuate."}
                  </p>
                  <span className="text-xs text-blue-400">
                    {closestWildfire.distance.toFixed(1)} km away
                  </span>
                </div>
              </li>
            )}

            {(showAllWildfires
              ? filteredWildfires
              : filteredWildfires.slice(0, 10)
            ).map((wildfire, index) => (
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
                <div className="flex flex-col">
                  <p className="font-medium">
                    {wildfire.country && wildfire.state ? (
                      <span className="text-yellow-400">
                        {wildfire.state}, <strong>{wildfire.country}</strong>
                      </span>
                    ) : wildfire.country ? (
                      <span className="text-yellow-400">
                        <strong>{wildfire.country}</strong>
                      </span>
                    ) : wildfire.locationName ? (
                      <span className="text-yellow-400">
                        {wildfire.locationName}
                      </span>
                    ) : (
                      <span className="text-gray-400">Unknown Location</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Coordinates:</strong>{" "}
                    {formatCoordinates(wildfire.location)}
                  </p>
                </div>
              </li>
            ))}
            {!showAllWildfires && filteredWildfires.length > 10 && (
              <li
                className="p-2 bg-gray-800 rounded text-center cursor-pointer hover:bg-gray-700 transition"
                onClick={() => setShowAllWildfires(true)}
              >
                View More ({filteredWildfires.length - 10} more)
              </li>
            )}
            {filteredWildfires.length === 0 && (
              <li className="p-4 bg-gray-800 rounded text-center">
                No wildfires found for "{searchQuery}"
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
