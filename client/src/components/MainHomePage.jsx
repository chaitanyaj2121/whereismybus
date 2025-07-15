import React from "react"
import { MapPin, Clock, Users, Shield, Navigation, Bus } from "lucide-react"

const MainHomePage = () => {
  const features = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Real-time Tracking",
      description:
        "Track your bus location in real-time and get accurate arrival times",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Live Updates",
      description:
        "Get instant notifications about delays, route changes, and schedules",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Passenger Info",
      description:
        "View bus capacity, crowd levels, and plan your journey better",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Safe & Secure",
      description: "Government-verified drivers and secure digital platform",
    },
    {
      icon: <Navigation className="w-6 h-6" />,
      title: "Route Planning",
      description: "Find the best routes and connections for your destination",
    },
    {
      icon: <Bus className="w-6 h-6" />,
      title: "Bus Information",
      description: "Get detailed information about bus amenities and services",
    },
  ]

  const handlePassengerClick = () => {
    window.location.href = "/search"
  }

  const handleDriverClick = () => {
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-green-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Smart Track
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Your Smart Public Transport Companion - Track, Plan, and Travel
              with Confidence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handlePassengerClick}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <MapPin className="w-5 h-5" />
                Track Your Bus
              </button>
              <button
                onClick={handleDriverClick}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
              >
                <Shield className="w-5 h-5" />
                Driver Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bus Images Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Modern Public Transport Fleet
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience comfortable and safe travel with our modern fleet of
            buses equipped with latest technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
            <img
              src="https://i0.wp.com/emobilityplus.com/wp-content/uploads/2024/02/GGOD2QjWsAE_WyG.jpeg?fit=960%2C640&ssl=1"
              alt="Modern Electric Bus"
              className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl relative z-10"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 z-20">
              <h3 className="font-semibold text-gray-900 mb-1">
                Electric Bus Fleet
              </h3>
              <p className="text-sm text-gray-600">
                Eco-friendly and efficient transportation
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-2xl transform group-hover:scale-105 transition-transform duration-300"></div>
            <img
              src="https://www.livemint.com/lm-img/img/2025/01/25/600x338/20250111-MTH-PGD-MN-MSRTC-New-Buses-001009-0_1737783410590_1737783510915.JPG"
              alt="MSRTC Bus Fleet"
              className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl relative z-10"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 z-20">
              <h3 className="font-semibold text-gray-900 mb-1">
                MSRTC Bus Service
              </h3>
              <p className="text-sm text-gray-600">
                Reliable intercity and local transportation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose SmartTrack?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the features that make your public transport experience
              seamless and efficient
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of commuters who trust BusTracker Pro for their daily
            travel needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handlePassengerClick}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <MapPin className="w-5 h-5" />
              Find Your Bus Now
            </button>
            <button
              onClick={handleDriverClick}
              className="bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 hover:bg-blue-900"
            >
              <Shield className="w-5 h-5" />
              Driver Portal
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 BusTracker Pro. All rights reserved. | Government Verified
            Digital Platform
          </p>
        </div>
      </footer>
    </div>
  )
}

export default MainHomePage
