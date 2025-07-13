import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Bus, Search, MapPin } from "lucide-react"

// Import Firebase Firestore modules
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming firebase/config exports 'db'

const PassengerHomePage = () => {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [allStops, setAllStops] = useState([])
  const [filteredFromSuggestions, setFilteredFromSuggestions] = useState([])
  const [filteredToSuggestions, setFilteredToSuggestions] = useState([])
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [searchResult, setSearchResult] = useState("") // Only for "No Bus Found" now
  const [loadingSearch, setLoadingSearch] = useState(false)
  const navigate = useNavigate()

  // Fetch all stops from Firestore routes for suggestions
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
        // Optionally, show an error message to the user, e.g., using a state variable
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
            // Bus found for this route, add it to matchingRoutes
            matchingRoutes.push({
              routeName: route.routeName,
              stops: route.stops,
              // Add any other relevant route data you want to display
              staticDepartureTime: "12:00 PM", // Static time as requested
            })
          }
        }
      })

      if (matchingRoutes.length > 0) {
        // If buses are found, navigate to SearchResultsPage
        navigate("/searchResults", {
          state: { from, to, routes: matchingRoutes },
        })
      } else {
        // If no buses found, display message on current page
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
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 lg:p-10 flex flex-col"
    >
      {/* Hero Section */}
      <header className="text-center mb-10 lg:mb-16">
        <div className="flex justify-center mb-4">
          <Bus className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3">
          Track Your Bus in Real Time
        </h1>
        <p className="text-lg lg:text-xl font-light text-gray-600 max-w-2xl mx-auto">
          No more waiting. Know when your bus is arriving.
        </p>
      </header>

      {/* Search Section */}
      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 lg:p-8 backdrop-blur-sm bg-opacity-80">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label
                  htmlFor="from"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  From
                </label>
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                  autoComplete="off"
                />
                {showFromSuggestions && filteredFromSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredFromSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onMouseDown={() => selectFromSuggestion(suggestion)}
                        className="p-3 hover:bg-blue-100 cursor-pointer flex items-center text-gray-800"
                      >
                        <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="relative">
                <label
                  htmlFor="to"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  To
                </label>
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                  autoComplete="off"
                />
                {showToSuggestions && filteredToSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredToSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onMouseDown={() => selectToSuggestion(suggestion)}
                        className="p-3 hover:bg-blue-100 cursor-pointer flex items-center text-gray-800"
                      >
                        <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loadingSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition duration-300 transform hover:scale-[1.01] shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loadingSearch ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Find Buses</span>
                </>
              )}
            </button>
          </form>

          {/* Search Result Display (only for "No Bus Found") */}
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 p-4 rounded-lg text-center bg-red-100 text-red-800 border border-red-200"
            >
              <p className="font-semibold text-lg mb-1">{searchResult}</p>
            </motion.div>
          )}
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

export default PassengerHomePage
