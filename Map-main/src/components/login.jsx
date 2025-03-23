import { useState } from 'react';
import { UserIcon, KeyIcon, MapIcon, ShieldAlertIcon, BellIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login submitted:', formData);

    // Send check request to the backend to validate credentials
    try {
      const response = await fetch('https://genesisw23-5c5848ef2953.herokuapp.com/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.exists) {
        console.log('Login successful');
        // Navigate to dashboard or another page after successful login
        navigate('/main', { state: { username: formData.username } });
      } else {
        console.log('Login failed:', result.message);
        alert(result.message); // Show error message if credentials don't match
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-red-500 rounded-full filter blur-3xl"></div>
      </div>
      
      {/* Hero Section - Left Side */}
      <div className="w-full md:w-1/2 flex flex-col p-8 md:p-16 justify-center relative z-10">
        
        {/* App Logo and Title */}
        <div className="flex items-center mb-8">
          <svg className="w-12 h-12 text-red-500 mr-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,23c-1.7,0-3-1.3-3-3c0-1.9,3-6,3-6s3,4.1,3,6C15,21.7,13.7,23,12,23z M17,10c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3 S17,11.7,17,10z M7,10c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3S7,11.7,7,10z M4,14c0-1.9,3-6,3-6s3,4.1,3,6c0,1.7-1.3,3-3,3 S4,15.7,4,14z M12,2c0,0,3,4.1,3,6c0,1.7-1.3,3-3,3S9,9.7,9,8C9,6.1,12,2,12,2z" />
          </svg>
          <h1 className="text-5xl font-bold text-white">EmberEye</h1>
        </div>
        
        {/* Hero Message */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Stay Informed, Stay Safe</h2>
          <p className="text-xl text-gray-300 mb-6 leading-relaxed">
            A real-time wildfire tracking and risk assessment platform that helps you stay informed and prepared.
          </p>
          <div className="bg-black bg-opacity-30 p-4 rounded-lg border border-gray-800">
            <p className="text-gray-400 italic">
              "EmberEye has revolutionized how we monitor and respond to wildfire threats in our community."
            </p>
            <p className="text-gray-500 mt-2">— Emergency Response Team</p>
          </div>
        </div>
        
        {/* Key Features */}
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-white">Key Features</h3>
          
          <div className="flex items-start">
            <div className="bg-orange-600 p-2 rounded-lg mr-4">
              <MapIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-white">Real-time Mapping</h4>
              <p className="text-gray-400">Track active wildfires with precise location data and spread patterns</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-red-600 p-2 rounded-lg mr-4">
              <ShieldAlertIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-white">Risk Assessment</h4>
              <p className="text-gray-400">AI-powered analysis of wildfire risks based on terrain, weather, and historical data</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-orange-500 p-2 rounded-lg mr-4">
              <BellIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-white">Alerts & Notifications</h4>
              <p className="text-gray-400">Get timely alerts about nearby wildfires and changing conditions</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Login Section - Right Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 relative z-10">
        <div className="w-full max-w-md p-8 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-lg shadow-xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
          
          <div className="space-y-4 mb-6 relative z-10">
            <h2 className="text-2xl font-bold text-center text-white">Welcome Back</h2>
            <p className="text-center text-gray-400">
              Sign in to access your personalized dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                         text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-700
                         focus:ring-1 focus:ring-orange-700"
                required
              />
            </div>

            <div className="relative">
              <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                         text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-700
                         focus:ring-1 focus:ring-orange-700"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg
                       transition-colors duration-200 font-semibold"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-400 hover:text-orange-300 transition-colors font-semibold">
              Sign up
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <button 
              onClick={() => navigate('/main')}
              className="text-gray-400 hover:text-white hover:underline text-sm transition-all"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
