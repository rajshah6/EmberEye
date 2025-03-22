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
  const [redSpreads, setRedSpreads] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isAddingMarkers, setIsAddingMarkers] = useState(false);
  const [visibleMarkerCounts, setVisibleMarkerCounts] = useState({ wildfires: 0, redSpreads: 0 });
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const markerDataRef = useRef({ wildfires: [], redSpreads: [] });
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

  const fetchRedSpread = async () => {
    try {
      const response = await fetch('http://localhost:5000/get_red_spread');
      if (!response.ok) throw new Error('Failed to fetch red spread');
      const data = await response.json();
      setRedSpreads(data);
      markerDataRef.current.redSpreads = data;
    } catch (error) {
      console.error('Error fetching red spread:', error);
    }
  };

  // Check if a location is within the current map bounds
  const isInBounds = (location) => {
    if (!visibleBoundsRef.current || !location || !Array.isArray(location) || location.length !== 2) {
      return false;
    }
    
    const [lng, lat] = location;
    return visibleBoundsRef.current.contains([lng, lat]);
  };

  const addMarkers = () => {
    if (!mapRef.current || isAddingMarkers) return;
    
    setIsAddingMarkers(true);
    
    // Get current map bounds
    visibleBoundsRef.current = mapRef.current.getBounds();
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Track visible markers by type
    let visibleWildfires = 0;
    let visibleRedSpreads = 0;
    
    // Create worker for batch processing
    const addMarkersInBatches = async (data, isWildfire) => {
      // Only add markers that are in the current viewport
      const markersToAdd = data.filter(item => isInBounds(item.location));
      
      // Update counts
      if (isWildfire) {
        visibleWildfires = markersToAdd.length;
      } else {
        visibleRedSpreads = markersToAdd.length;
      }
      
      // Process in batches of 100
      const batchSize = 100;
      const batches = Math.ceil(markersToAdd.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, markersToAdd.length);
        const batch = markersToAdd.slice(start, end);
        
        // Add batch of markers
        batch.forEach((item) => {
          if (item.location && Array.isArray(item.location) && item.location.length === 2) {
            const [longitude, latitude] = item.location;
            
            if (isWildfire) {
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
            } else {
              // Create custom red dot element
              const el = document.createElement('div');
              el.style.backgroundColor = '#FF0000';
              el.style.width = '10px';
              el.style.height = '10px';
              el.style.borderRadius = '50%';
              el.style.cursor = 'pointer';
              
              const marker = new mapboxgl.Marker(el)
                .setLngLat([longitude, latitude])
                .addTo(mapRef.current);
              
              markersRef.current.push(marker);
            }
          }
        });
        
        // Allow browser to render and prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    };
    
    // Add markers in batches
    Promise.all([
      addMarkersInBatches(markerDataRef.current.wildfires, true),
      addMarkersInBatches(markerDataRef.current.redSpreads, false)
    ]).then(() => {
      setIsAddingMarkers(false);
      
      // Update visible marker counts
      setVisibleMarkerCounts({
        wildfires: visibleWildfires,
        redSpreads: visibleRedSpreads
      });
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

      await Promise.all([fetchWildfires(), fetchRedSpread()]);
      addMarkers();
    });
    
    // Refresh markers when map is moved
    map.on('moveend', () => {
      if (!isAddingMarkers) {
        addMarkers();
      }
    });
    
    // Add zoom end handler to only show markers based on current viewport
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
    
    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && (wildfires.length > 0 || redSpreads.length > 0)) {
      markerDataRef.current = { wildfires, redSpreads };
      if (!isAddingMarkers) {
        addMarkers();
      }
    }
  }, [wildfires, redSpreads, mapLoaded]);

  //GENERATED COHERE TEXT NOT SHOWING, VARIABLE DATA IS BEING RECEIVED SO API WORKS HOWEVER FRONT IS NOT SHOWING THIS GENERATED TEXT
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
                    prompt: `Generate insights for ${selectedMarker.location} which is a heat anomaly detected by NASA. Some more information about it is ${selectedMarker.temperature}°C, humidity: ${selectedMarker.humidity}%, wind speed: ${selectedMarker.wind_speed} m/s, wind direction: ${selectedMarker.wind_direction}°, rain ${selectedMarker.rain}mm and clouds ${selectedMarker.clouds}%`,
                    max_tokens: 150
                })
            });
            
            const data = await response.json();
          
            if (data.generations?.[0]?.text) {
                setAiDescription(data.generations[0].text);
            } else {
                setError('No insights generated');
            }
        } catch (error) {
            console.error("Error fetching Cohere data:", error);
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
            {/* AI Insights Section */}
            <div className="mb-4 bg-gray-700 p-3 rounded-lg">
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : aiDescription ? (
                <p className="text-gray-200">{aiDescription}</p>
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

            {/* Weather Data */}
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
          
          <div className="flex justify-between">
            <button 
              onClick={fetchCohereData}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={isLoading}
            >
              {aiDescription ? 'Regenerate' : 'Generate Insights'}
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
          <Link to="/ent">
            <button className="bg-white text-gray-900 font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-gray-200 transition duration-200">
              Submit Test Marker
            </button>
          </Link>
          
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
                  <p><strong>Location:</strong> {wildfire.location.join(', ')}</p>
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

        <div className="mt-6 text-gray-300">
          <h2 className="text-xl font-bold">Red Spread Information</h2>
          <p className="text-sm text-gray-400">
            Total: {redSpreads.length} | Visible: {visibleMarkerCounts.redSpreads}
          </p>
          {redSpreads.length === 0 ? (
            <p>No Red Spread information available</p>
          ) : (
            <ul className="space-y-2 mt-2">
              {redSpreads.slice(0, 10).map((redSpread, index) => (
                <li key={`redspread-${index}`} className="p-2 bg-red-900 bg-opacity-30 rounded border border-red-700">
                  <p><strong>Type:</strong> {redSpread.type}</p>
                  <p><strong>Location:</strong> {redSpread.location.join(', ')}</p>
                </li>
              ))}
              {redSpreads.length > 10 && (
                <li className="p-2 bg-red-900 bg-opacity-30 rounded text-center border border-red-700">
                  + {redSpreads.length - 10} more red spreads
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
