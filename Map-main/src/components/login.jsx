import { useState } from 'react';
import { UserIcon, KeyIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';  // Add useNavigate for routing

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
      const response = await fetch('http://localhost:5000/api/check', {
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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-center text-white">Welcome Back</h1>
          <p className="text-center text-gray-400">
            Enter your credentials to access your account
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
                       text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-600
                       focus:ring-1 focus:ring-gray-600"
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
                       text-white placeholder:text-gray-500 focus:outline-none focus:border-gray-600
                       focus:ring-1 focus:ring-gray-600"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg
                     transition-colors duration-200 font-semibold"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-gray-400 hover:text-white transition-colors font-semibold">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
