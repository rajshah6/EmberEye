import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FileIcon } from 'lucide-react';

const DisasterFormWithMap = () => {
  const [formData, setFormData] = useState({
    disasterType: '',
    picture: null,
    location: null,
  });
  const [response, setResponse] = useState(null);
  const mapContainerRef = useRef(null);
  const markerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [locationError, setLocationError] = useState('');
  const username = location.state?.username;

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXVta2FybWFsaSIsImEiOiJjbTNydmViNWYwMDEwMnJwdnhra3lqcTdiIn0.uENwb1XNsjEY1Y9DUWwslw';

    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            initMap(longitude, latitude);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLocationError('Unable to retrieve your location.');
            initMap(-122.4194, 37.7749);
          }
        );
      } else {
        setLocationError('Geolocation is not supported by this browser.');
        initMap(-122.4194, 37.7749);
      }
    };

    const initMap = (longitude, latitude) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [longitude, latitude],
        zoom: 12,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        })
      );

      map.on('click', (event) => {
        const { lng, lat } = event.lngLat;
        setFormData((prev) => ({ ...prev, location: [lng, lat] }));

        if (markerRef.current) {
          markerRef.current.remove();
        }

        const marker = new mapboxgl.Marker({ color: 'red', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on('dragend', () => {
          const newLocation = marker.getLngLat();
          setFormData((prev) => ({ ...prev, location: [newLocation.lng, newLocation.lat] }));
        });

        markerRef.current = marker;
      });
    };

    getCurrentLocation();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === 'picture') {
      setFormData({ ...formData, picture: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.disasterType && formData.picture && formData.location) {
      const formDataToSend = new FormData();
      formDataToSend.append('image', formData.picture);
      formDataToSend.append('location', JSON.stringify(formData.location));
      formDataToSend.append('disasterType', formData.disasterType);

      try {
        const res = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          body: formDataToSend,
        });

        if (!res.ok) {
          throw new Error('Failed to fetch from Flask app');
        }

        const data = await res.json();
        setResponse(data);

        navigate('/main', { state: { refresh: true, username } });
        window.location.reload(); // Ensures new markers appear
      } catch (error) {
        console.error('Error:', error);
        setResponse({ error: 'Failed to send the data to the server.' });
      }
    } else {
      alert('Please select a disaster type, upload a valid .jpg file, and select a location on the map.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-black">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800 mb-8">
        <h1 className="text-2xl font-bold text-center text-white">Report a Natural Disaster</h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <select
            name="disasterType"
            value={formData.disasterType}
            onChange={handleChange}
            className="w-full py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            required
          >
            <option value="" disabled>Select a Natural Disaster</option>
            <option value="earthquake">Earthquake</option>
            <option value="flood">Flood</option>
            <option value="tsunami">Tsunami</option>
          </select>
          <div className="relative">
            <FileIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="file"
              name="picture"
              accept=".jpg,.jpeg"
              onChange={handleChange}
              className="w-full pl-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Submit Report
          </button>
        </form>
      </div>
      <div className="w-full h-96 bg-gray-800 border border-gray-700 rounded-lg">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
      {locationError && <p className="text-red-500 text-center mt-4">{locationError}</p>}
    </div>
  );
};

export default DisasterFormWithMap;
