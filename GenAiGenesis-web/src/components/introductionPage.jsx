import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLocation, Link, useNavigate } from 'react-router-dom';

const mapStyles = {
  mapContainer: {
    width: '100%',
    height: '100%',
    borderLeft: '1px solid #374151',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
};

const IntroductionPage = () => {
  const [wildfires, setWildfires] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isAddingMarkers, setIsAddingMarkers] = useState(false);
  const [visibleMarkerCounts, setVisibleMarkerCounts] = useState({ wildfires: 0 });
  const [isSpreadLoading, setIsSpreadLoading] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const spreadLayersRef = useRef([]);
  const markerDataRef = useRef({ wildfires: [] });
  const visibleBoundsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  mapboxgl.accessToken = 'pk.eyJ1IjoiYXVta2FybWFsaSIsImEiOiJjbTNydmViNWYwMDEwMnJwdnhra3lqcTdiIn0.uENwb1XNsjEY1Y9DUWwslw';

  const fetchWildfires = async () => {
    try {
      const response = await fetch('http://localhost:5000/wildfires');
      if (!response.ok) throw new Error('Failed to fetch wildfires');
      const data = await response.json();
      setWildfires(data);
      markerDataRef.current.wildfires = data;
    } catch (error) {
      console.error('Error fetching wildfires:', error);
    }
  };

  const isInBounds = (location) => {
    if (!visibleBoundsRef.current || !location || !Array.isArray(location) || location.length !== 2) {
      return false;
    }
    
    const [lng, lat] = location;
    
    if (typeof lng !== 'number' || typeof lat !== 'number' || 
        isNaN(lng) || isNaN(lat) ||
        lat < -90 || lat > 90 || 
        lng < -180 || lng > 180) {
      return false;
    }
    
    return visibleBoundsRef.current.contains([lng, lat]);
  };

  const fetchSpreadData = async () => {
    if (!mapRef.current || !selectedMarker) return;
  
    setIsSpreadLoading(true);
    try {
      // Send all the data of the selected marker to the API
      const response = await fetch('http://localhost:5000/get_red_spread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      });
  
      if (!response.ok) throw new Error('Failed to fetch spread data');
  
      const data = await response.json();
  
      // Remove previous spread layers
      spreadLayersRef.current.forEach(layerId => {
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
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [data.longitude, data.latitude],
            },
            properties: {
              description: 'Spread Point',
            },
          },
        });
  
        // Create a source for the spread area
        mapRef.current.addSource(spreadAreaId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [data.longitude, data.latitude],
            },
          },
        });
  
        // Add a large circle to represent the spread area
        mapRef.current.addLayer({
          id: spreadAreaId,
          type: 'circle',
          source: spreadAreaId,
          paint: {
            // Convert spread_radius to pixels using the proper scale
            // Assuming spread_radius is in meters, we need to adjust based on zoom level
            'circle-radius': {
              'base': 2,
              'stops': [
                [0, 0],
                [7, data.spread_radius / 100],
                [10, data.spread_radius / 30],
                [15, data.spread_radius / 10],
                [20, data.spread_radius / 2]
              ]
            },
            'circle-color': '#de8162',
            'circle-opacity': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FF0000',
            'circle-stroke-opacity': 0.6
          },
        });
  
        // Add a small point for the center
        mapRef.current.addLayer({
          id: spreadPointId,
          type: 'circle',
          source: spreadPointId,
          paint: {
            'circle-radius': 5,
            'circle-color': '#de8162',
            'circle-opacity': 0.8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#FFFFFF',
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
    } catch (error) {
      console.error('Error fetching spread data:', error);
    } finally {
      setIsSpreadLoading(false);
    }
  };

  const addMarkers = () => {
    if (!mapRef.current || isAddingMarkers) return;
    
    setIsAddingMarkers(true);
    visibleBoundsRef.current = mapRef.current.getBounds();
    
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    let visibleWildfires = 0;
    
    const addMarkersInBatches = async (data) => {
      const markersToAdd = data.filter(item => {
        if (!item.location || !Array.isArray(item.location) || item.location.length !== 2) {
          return false;
        }
        
        const [lng, lat] = item.location;
        
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            isNaN(lng) || isNaN(lat) || 
            lat < -90 || lat > 90 || 
            lng < -180 || lng > 180) {
          console.warn('Invalid coordinates:', item.location);
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
            
            marker.getElement().addEventListener('click', () => {
              setSelectedMarker({
                ...item,
                markerType: 'wildfire'
              });
              setShowPopup(true);
            });
            
            markersRef.current.push(marker);
          } catch (error) {
            console.error('Error adding marker:', error, item);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };
    
    addMarkersInBatches(markerDataRef.current.wildfires)
      .then(() => {
        setIsAddingMarkers(false);
        setVisibleMarkerCounts({ wildfires: visibleWildfires });
      })
      .catch(error => {
        console.error('Error adding markers:', error);
        setIsAddingMarkers(false);
      });
  };

  const initializeMap = (longitude = 0, latitude = 0, zoom = 2) => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', async () => {
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
    
    map.on('moveend', () => {
      if (!isAddingMarkers) {
        addMarkers();
      }
    });
    
    map.on('zoomend', () => {
      if (!isAddingMarkers) {
        addMarkers();
      }
    });
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          initializeMap(longitude, latitude, 14);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Please ensure location services are enabled.');
          initializeMap();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
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

  const MarkerPopup = () => {
    const [aiDescription, setAiDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!selectedMarker || !showPopup) return null;

    const isWildfire = selectedMarker.markerType === 'wildfire';
    const headerColor = isWildfire ? "bg-gray-800" : "bg-red-800";

    const fetchCohereData = async () => {
        try {
            setIsLoading(true);
            setError('');
            setAiDescription('');
            
            const response = await fetch("https://api.cohere.ai/generate", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ExsK01ja38y8hutQyEYh9ymJzsVSa5ig1DgscgzY`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "command",
                    prompt: `Generate insights for ${selectedMarker.location} which is a heat anomaly detected by NASA assumed to be a wildfire. Some more information about it is ${selectedMarker.temperature}°C, humidity: ${selectedMarker.humidity}%, wind speed: ${selectedMarker.wind_speed} m/s, wind direction: ${selectedMarker.wind_direction}°, rain ${selectedMarker.rain}mm and clouds ${selectedMarker.clouds}%. Strictly speak about the details about the wildfire in that area. Keep the length 3-5 sentences.`,
                    max_tokens: 150
                })
            });
            
            const data = await response.json();
            if (data && data.text) {
                setAiDescription(data.text);
            } else {
                setError('No insights generated');
            }
        } catch (error) {
            setError('Failed to generate insights');
        } finally {
            setIsLoading(false);
        }
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full border border-gray-700">
          <div className={`flex justify-between items-start mb-4 -m-6 p-4 ${headerColor} rounded-t-lg`}>
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
              <h4 className="text-lg font-semibold mb-2 text-white">AI Insights</h4>
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : aiDescription ? (
                <div className="text-gray-200 whitespace-pre-wrap">{aiDescription}</div>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating insights...
                </div>
              ) : (
                <p className="text-gray-400">Click "Generate Insights" for AI analysis</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Location:</strong> {selectedMarker.location?.join(', ') || 'N/A'}</p>
                <p className="mt-2"><strong>Temperature:</strong> {selectedMarker.temperature}°C</p>
                <p className="mt-2"><strong>Humidity:</strong> {selectedMarker.humidity}%</p>
              </div>
              <div>
                <p><strong>Wind Speed:</strong> {selectedMarker.wind_speed} m/s</p>
                <p className="mt-2"><strong>Wind Gust:</strong> {selectedMarker.wind_gust} m/s</p>
                <p className="mt-2"><strong>Wind Direction:</strong> {selectedMarker.wind_direction}°</p>
                <p className="mt-2"><strong>Rain:</strong> {selectedMarker.rain}mm</p>
              </div>
            </div>
            <div className="mt-4">
              <p><strong>Cloud Cover:</strong> {selectedMarker.clouds}%</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={fetchCohereData}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={isLoading}
            >
              {aiDescription ? 'Regenerate' : 'Generate Insights'}
            </button>
            <button 
              onClick={fetchSpreadData}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={isSpreadLoading}
            >
              {isSpreadLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Spreading...
                </div>
              ) : 'Spread'}
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

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="w-1/3 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-4 text-white">Welcome {username}!</h1>
        <p className="text-lg mb-4 text-gray-300">This is where the content goes.</p>

        <div className="flex space-x-4">
          
          
          <button
            onClick={() => navigate('/login')}
            className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-red-600 transition duration-200"
          >
            Log Out
          </button>
        </div>

        {locationError && (
          <p className="text-red-400 mt-2">{locationError}</p>
        )}

        <div className="mt-6 text-gray-300">
          <h2 className="text-xl font-bold">Wildfire Information</h2>
          <p className="text-sm text-gray-400">
            Total: {wildfires.length} | Visible: {visibleMarkerCounts.wildfires}
          </p>
          {wildfires.length === 0 ? (
            <p>No wildfire information available</p>
          ) : (
            <ul className="space-y-2 mt-2">
              {wildfires.slice(0, 10).map((wildfire, index) => (
                <li key={`wildfire-${index}`} className="p-2 bg-gray-800 rounded">
                  <p><strong>Type:</strong> {wildfire.type}</p>
                  <p><strong>Location:</strong> {Array.isArray(wildfire.location) ? wildfire.location.join(', ') : 'Invalid location'}</p>
                </li>
              ))}
              {wildfires.length > 10 && (
                <li className="p-2 bg-gray-800 rounded text-center">
                  + {wildfires.length - 10} more wildfires
                </li>
              )}
            </ul>
          )}
        </div>

        {isAddingMarkers && (
          <div className="fixed bottom-4 left-4 bg-blue-900 text-white px-4 py-2 rounded-lg">
            Loading markers...
          </div>
        )}
      </div>

      <div className="w-2/3 h-screen relative">
        <div ref={mapContainerRef} style={{ ...mapStyles.absoluteFill, ...mapStyles.mapContainer}} />
        <MarkerPopup />
      </div>
    </div>
  );
};

export default IntroductionPage;