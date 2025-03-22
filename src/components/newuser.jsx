import React, { useState } from "react";
import { UserIcon, KeyIcon } from "lucide-react";
import { Link } from 'react-router-dom'; // Import Link for navigation

const SignUp = () => {
  const [formData, setFormData] = useState({
    Nusername: "",
    Npassword: "",
    Cpassword: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { Nusername, Npassword, Cpassword } = formData;

    if (Npassword !== Cpassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: Nusername,
          password: Npassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert("User registered successfully!");
        console.log("Response:", result);
        setFormData({ Nusername: "", Npassword: "", Cpassword: "" }); // Clear form
      } else {
        console.error("Failed to register user:", response.statusText);
        alert("Failed to register user. Please try again.");
      }
    } catch (error) {
      console.error("Error occurred while registering user:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-center text-white">Sign Up</h1>
          <p className="text-center text-gray-400">
            Enter your credentials to create an account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="Nusername"
              placeholder="New Username"
              value={formData.Nusername}
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
              name="Npassword"
              placeholder="New Password"
              value={formData.Npassword}
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
              name="Cpassword"
              placeholder="Confirm Password"
              value={formData.Cpassword}
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
            Sign Up
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-gray-400 hover:text-white transition-colors font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
