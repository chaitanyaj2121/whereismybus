import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Bus, Clock, MapPin, ArrowLeft } from "lucide-react"

const SearchResultsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [foundRoutes, setFoundRoutes] = useState([])

  useEffect(() => {
    // Get data from navigation state
    if (location.state && location.state.routes) {
      setFrom(location.state.from)
      setTo(location.state.to)
      setFoundRoutes(location.state.routes)
    } else {
      // If no state, it means direct access or refresh, so navigate back or show a message
      // For now, let's just show no results. In a real app, you might re-fetch or redirect.
      setFoundRoutes([])
    }
  }, [location.state])

  const handleBackToSearch = () => {
    navigate("/") // Navigate back to the PassengerHomePage
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 lg:p-10 flex flex-col"
    >
      {/* Header */}
      <header className="text-center mb-8 lg:mb-12">
        <div className="flex justify-center mb-4">
          <Bus className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Bus Search Results
        </h1>
        <p className="text-lg lg:text-xl font-light text-gray-600">
          From: <span className="font-semibold capitalize">{from}</span> to{" "}
          <span className="font-semibold capitalize">{to}</span>
        </p>
      </header>

      {/* Results Section */}
      <main className="flex-grow flex items-start justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 lg:p-8 backdrop-blur-sm bg-opacity-80">
          {foundRoutes.length > 0 ? (
            <div className="space-y-6">
              {foundRoutes.map((route, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-green-800 mb-1">
                      Route: {route.routeName}
                    </h3>
                    <p className="text-gray-700 text-sm flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-green-600" />
                      Stops: {route.stops.join(" → ")}
                    </p>
                  </div>
                  <div className="flex items-center text-green-700 font-semibold text-lg">
                    <Clock className="h-5 w-5 mr-2" />
                    {route.staticDepartureTime} (Static)
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-xl font-semibold text-gray-700 mb-4">
                No buses found for this route.
              </p>
              <p className="text-gray-500">
                Please try a different source or destination.
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={handleBackToSearch}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl
                         hover:bg-blue-700 transition duration-300 transform hover:scale-[1.01] shadow-md"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Search
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-8">
        <p>Built for Bharat | Powered by Students</p>
      </footer>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')]"></div>
      </div>
    </motion.div>
  )
}

export default SearchResultsPage
