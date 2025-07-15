import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Bus, Search, MapPin, ArrowLeftRight, Navigation } from "lucide-react"

// Import Firebase Firestore modules
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming firebase/config exports 'db'

const HomePage = () => {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [allStops, setAllStops] = useState([])
  const [filteredFromSuggestions, setFilteredFromSuggestions] = useState([])
  const [filteredToSuggestions, setFilteredToSuggestions] = useState([])
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [searchResult, setSearchResult] = useState("") // Only for "No Bus Found" now
  const [loadingSearch, setLoadingSearch] = useState(false)
  const navigate = useNavigate() // Fetch all stops from Firestore routes for suggestions

  useEffect(() => {
    const fetchAllStops = async () => {
      try {
        const routesRef = collection(db, "routes")
        const querySnapshot = await getDocs(routesRef)
        const uniqueStops = new Set()

        querySnapshot.forEach((doc) => {
          const route = doc.data()
          if (route.stops && Array.isArray(route.stops)) {
            route.stops.forEach((stop) => {
              if (typeof stop === "string" && stop.trim() !== "") {
                uniqueStops.add(stop.trim().toLowerCase())
              }
            })
          }
        })
        setAllStops(Array.from(uniqueStops))
      } catch (error) {
        console.error("Error fetching all stops:", error)
      }
    }

    fetchAllStops()
  }, [])

  // Handle input changes for 'From' field and filter suggestions
  const handleFromChange = (e) => {
    const value = e.target.value
    setFrom(value)
    if (value.length > 0) {
      const suggestions = allStops.filter((stop) =>
        stop.startsWith(value.toLowerCase())
      )
      setFilteredFromSuggestions(suggestions)
      setShowFromSuggestions(true)
    } else {
      setShowFromSuggestions(false)
    }
    setSearchResult("") // Clear previous search result on input change
  }

  // Handle input changes for 'To' field and filter suggestions
  const handleToChange = (e) => {
    const value = e.target.value
    setTo(value)
    if (value.length > 0) {
      const suggestions = allStops.filter((stop) =>
        stop.startsWith(value.toLowerCase())
      )
      setFilteredToSuggestions(suggestions)
      setShowToSuggestions(true)
    } else {
      setShowToSuggestions(false)
    }
    setSearchResult("") // Clear previous search result on input change
  }

  // Select a suggestion for 'From'
  const selectFromSuggestion = (suggestion) => {
    setFrom(suggestion)
    setShowFromSuggestions(false)
  }

  // Select a suggestion for 'To'
  const selectToSuggestion = (suggestion) => {
    setTo(suggestion)
    setShowToSuggestions(false)
  }

  // Exchange from and to values
  const exchangeValues = () => {
    const tempFrom = from
    setFrom(to)
    setTo(tempFrom)
    setSearchResult("") // Clear previous search result
  }

  // Handle search logic
  const handleSearch = async (e) => {
    e.preventDefault()
    setLoadingSearch(true)
    setSearchResult("") // Clear previous results

    if (!from.trim() || !to.trim()) {
      alert("Please enter both source and destination.")
      setLoadingSearch(false)
      return
    }

    try {
      const routesRef = collection(db, "routes")
      const querySnapshot = await getDocs(routesRef)
      const matchingRoutes = []

      const searchFrom = from.trim().toLowerCase()
      const searchTo = to.trim().toLowerCase()

      querySnapshot.forEach((doc) => {
        const route = { id: doc.id, ...doc.data() }
        if (route.stops && Array.isArray(route.stops)) {
          const routeStopsLower = route.stops.map((stop) => stop.toLowerCase())
          const fromIndex = routeStopsLower.indexOf(searchFrom)
          const toIndex = routeStopsLower.indexOf(searchTo)

          if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
            matchingRoutes.push({
              id: route.id,
              routeName: route.routeName,
              stops: route.stops,
              createdBy: route.createdBy,
              staticDepartureTime: route.routeStartTime,
            })
          }
        }
      })

      if (matchingRoutes.length > 0) {
        console.log("Navigating to /searchResults with routes:", matchingRoutes)
        navigate("/searchResults", {
          state: { from, to, routes: matchingRoutes },
        })
      } else {
        setSearchResult("No Bus Found for this route.")
      }
    } catch (error) {
      console.error("Error during bus search:", error)
      setSearchResult("Error searching for buses. Please try again.")
    } finally {
      setLoadingSearch(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100 p-4 lg:p-8 flex flex-col relative overflow-hidden"
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section */}
      <header className="text-center mb-8 lg:mb-12 relative">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-20"></div>
            <div className="relative bg-white rounded-full p-4 shadow-lg">
              <Bus className="h-12 w-12 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
        >
          Track Your Bus in Real Time
        </motion.h1>

        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-lg lg:text-xl font-light text-gray-600 max-w-2xl mx-auto"
        >
          No more waiting. Know exactly when your bus is arriving.
        </motion.p>
      </header>

      {/* Search Section */}
      <main className="flex-grow flex items-center justify-center">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="w-full max-w-4xl"
        >
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl p-6 lg:p-8 border border-white/20">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Input Fields Container */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* From Input */}
                  <div className="relative group">
                    <label
                      htmlFor="from"
                      className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
                    >
                      <Navigation className="h-4 w-4 text-blue-500" />
                      From
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="from"
                        value={from}
                        onChange={handleFromChange}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowFromSuggestions(false), 100)
                        }
                        placeholder="Enter starting point"
                        className="w-full px-4 py-4 pl-12 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md group-hover:border-blue-300"
                        required
                        autoComplete="off"
                      />
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>

                    {showFromSuggestions &&
                      filteredFromSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-20 w-full bg-white/95 backdrop-blur-md border-2 border-blue-100 rounded-xl shadow-xl mt-2 max-h-48 overflow-y-auto"
                        >
                          {filteredFromSuggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              onMouseDown={() =>
                                selectFromSuggestion(suggestion)
                              }
                              className="p-3 hover:bg-blue-50 cursor-pointer flex items-center text-gray-800 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                            >
                              <MapPin className="h-4 w-4 mr-3 text-blue-500" />
                              <span className="capitalize">{suggestion}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                  </div>

                  {/* To Input */}
                  <div className="relative group">
                    <label
                      htmlFor="to"
                      className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-purple-500" />
                      To
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="to"
                        value={to}
                        onChange={handleToChange}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowToSuggestions(false), 100)
                        }
                        placeholder="Enter destination"
                        className="w-full px-4 py-4 pl-12 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md group-hover:border-purple-300"
                        required
                        autoComplete="off"
                      />
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500" />
                    </div>

                    {showToSuggestions && filteredToSuggestions.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-20 w-full bg-white/95 backdrop-blur-md border-2 border-purple-100 rounded-xl shadow-xl mt-2 max-h-48 overflow-y-auto"
                      >
                        {filteredToSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            onMouseDown={() => selectToSuggestion(suggestion)}
                            className="p-3 hover:bg-purple-50 cursor-pointer flex items-center text-gray-800 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <MapPin className="h-4 w-4 mr-3 text-purple-500" />
                            <span className="capitalize">{suggestion}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </div>
                </div>

                {/* Exchange Button */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 md:block hidden">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exchangeValues}
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 border-4 border-white"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* Mobile Exchange Button */}
                <div className="md:hidden flex justify-center mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exchangeValues}
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Exchange</span>
                  </motion.button>
                </div>
              </div>

              {/* Search Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loadingSearch}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed transform"
              >
                {loadingSearch ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Searching for buses...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Find My Bus</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Search Result Display */}
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-6 rounded-xl text-center bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 shadow-md"
              >
                <div className="flex justify-center mb-2">
                  <div className="bg-red-100 rounded-full p-2">
                    <Bus className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="font-semibold text-lg text-red-800 mb-1">
                  {searchResult}
                </p>
                <p className="text-sm text-red-600">
                  Try different locations or check back later
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-8 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-2"
        >
          <span>Built for Bharat</span>
          <span className="text-blue-500">|</span>
          <span>Powered by Students</span>
        </motion.div>
      </footer>

      {/* Enhanced Background Pattern */}
      <div className="fixed inset-0 -z-20 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZGVmcz48cGF0dGVybiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')]"></div>
      </div>
    </motion.div>
  )
}

export default HomePage
