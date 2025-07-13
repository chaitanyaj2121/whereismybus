import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Bus,
  Clock,
  MapPin,
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle2, // Changed from Check to CheckCircle2 for better visual
  CircleDot, // Represents current stop better
  Circle, // Represents pending stop better
} from "lucide-react"

// Import Firebase Firestore modules
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming firebase/config exports 'db'

const BusDetailsPage = () => {
  const { sessionId } = useParams() // Get sessionId from URL params
  const navigate = useNavigate()
  const [sessionData, setSessionData] = useState(null)
  const [busDetails, setBusDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) {
      setError("No bus session ID provided.")
      setLoading(false)
      return
    }

    const fetchBusAndSessionData = async () => {
      try {
        // Fetch static bus details once
        const busDocRef = doc(db, "buses", sessionId) // sessionId is also busId
        const busDocSnap = await getDoc(busDocRef)
        if (busDocSnap.exists()) {
          setBusDetails(busDocSnap.data())
        } else {
          setError("Bus details not found.")
          setLoading(false)
          return
        }

        // Listen for real-time updates on the bus session
        const sessionDocRef = doc(db, "busRouteSessions", sessionId)
        const unsubscribe = onSnapshot(
          sessionDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setSessionData(snapshot.data())
              setLoading(false)
            } else {
              setError("Active bus session not found or ended.")
              setSessionData(null) // Clear session data if it no longer exists
              setLoading(false)
            }
          },
          (err) => {
            console.error("Error listening to bus session:", err)
            setError(`Failed to load live data: ${err.message}`)
            setLoading(false)
          }
        )

        return () => unsubscribe() // Clean up listener on unmount
      } catch (err) {
        console.error("Error fetching initial bus or session data:", err)
        setError(`Failed to load bus details: ${err.message}`)
        setLoading(false)
      }
    }

    fetchBusAndSessionData()
  }, [sessionId])

  const handleBack = () => {
    navigate(-1) // Go back to the previous page (SearchResultsPage)
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white p-8 rounded-2xl shadow-xl"
        >
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
          <p className="text-gray-700 text-xl font-medium">
            Loading live bus details...
          </p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white p-8 rounded-2xl shadow-xl border border-red-300"
        >
          <p className="text-red-600 text-2xl font-bold mb-4">{error}</p>
          <p className="text-gray-600 mb-6">
            Please try again or check your internet connection.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full
                         hover:bg-blue-700 transition duration-300 shadow-md transform hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5 mr-3" />
            Back to Results
          </button>
        </motion.div>
      </div>
    )
  }

  if (!sessionData || !busDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white p-8 rounded-2xl shadow-xl border border-orange-300"
        >
          <p className="text-orange-600 text-2xl font-bold mb-4">
            Bus session not found or has ended.
          </p>
          <p className="text-gray-600 mb-6">
            This bus might not be active on its route right now, or the session
            has concluded.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-full
                         hover:bg-blue-700 transition duration-300 shadow-md transform hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5 mr-3" />
            Back to Results
          </button>
        </motion.div>
      </div>
    )
  }

  const stops = sessionData.stops || []
  const currentStopIndex = sessionData.currentStopIndex || 0
  // const progress = sessionData.progress || {}; // 'progress' is not used directly in rendering currentStopIndex for timestamps, but if you need to display details per stop based on 'progress' field, you can use it.

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-12 sm:p-6 lg:p-10 flex flex-col items-center relative"
    >
      {/* Back Button - Positioned top-left */}
      <motion.button
        onClick={handleBack}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center px-4 py-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors duration-200 shadow-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        variants={itemVariants}
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Back
      </motion.button>

      {/* Header */}
      <motion.header
        className="text-center mt-12 mb-8 sm:mb-10 lg:mb-12 max-w-lg w-full"
        variants={sectionVariants}
      >
        <div className="flex justify-center mb-4">
          <Bus className="h-14 w-14 text-blue-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800 mb-2">
          Live Bus Tracking
        </h1>
        <p className="text-lg sm:text-xl font-medium text-gray-700">
          Route: <span className="font-bold">{sessionData.routeName}</span>
        </p>
        <p className="text-md sm:text-lg text-gray-600 mt-1">
          Bus: <span className="font-semibold">{busDetails.busNumber}</span> (
          {busDetails.busModel})
        </p>
      </motion.header>

      {/* Main Content */}
      <motion.main
        className="w-full max-w-3xl space-y-6 sm:space-y-8"
        variants={sectionVariants}
      >
        {/* Live Status Section */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm bg-opacity-90 border border-blue-100"
          variants={itemVariants}
        >
          <h2 className="text-2xl sm:text-2xl font-bold text-gray-800 mb-5 flex items-center">
            <MapPin className="h-7 w-7 mr-3 text-blue-600" /> Current Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
            <p className="font-semibold text-blue-800 flex items-center">
              <CircleDot className="h-5 w-5 mr-2 text-blue-500" />
              Current Stop: {stops[currentStopIndex] || "N/A"}
            </p>
            {currentStopIndex < stops.length - 1 && (
              <p className="text-blue-700 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-400" />
                Next Stop: {stops[currentStopIndex + 1]}
              </p>
            )}
            <p className="text-blue-700 flex items-center">
              <Play className="h-5 w-5 mr-2 text-blue-400" />
              Started At:{" "}
              {sessionData.startTime
                ?.toDate()
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) || "N/A"}
            </p>
            <p className="text-blue-700 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-400" />
              Last Updated:{" "}
              {sessionData.progress?.[currentStopIndex]?.startedAt
                ?.toDate()
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) || "N/A"}
            </p>
          </div>
        </motion.div>

        {/* Route Progress */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm bg-opacity-90 border border-green-100"
          variants={itemVariants}
        >
          <h2 className="text-2xl sm:text-2xl font-bold text-gray-800 mb-5 flex items-center">
            <Bus className="h-7 w-7 mr-3 text-green-600" /> Route Progress
          </h2>
          <div className="space-y-4">
            {stops.map((stop, index) => (
              <motion.div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-300
                  ${
                    index < currentStopIndex
                      ? "bg-green-50 border border-green-200"
                      : index === currentStopIndex
                      ? "bg-blue-50 border border-blue-200 shadow-md"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                variants={itemVariants}
              >
                <div
                  className={`flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full
                    ${
                      index < currentStopIndex
                        ? "bg-green-500 text-white"
                        : index === currentStopIndex
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                >
                  {index < currentStopIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : index === currentStopIndex ? (
                    <CircleDot className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`font-medium flex-1 text-lg
                    ${
                      index < currentStopIndex
                        ? "text-green-900"
                        : index === currentStopIndex
                        ? "text-blue-900 font-semibold"
                        : "text-gray-700"
                    }`}
                >
                  {stop}
                </span>
                {index < currentStopIndex && (
                  <div className="flex items-center text-sm text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Completed
                  </div>
                )}
                {index === currentStopIndex && (
                  <div className="flex items-center text-sm text-blue-600 font-medium">
                    <Clock className="h-4 w-4 mr-1" /> Current Location
                  </div>
                )}
                {index > currentStopIndex && (
                  <div className="flex items-center text-sm text-gray-500 font-medium">
                    <Circle className="h-4 w-4 mr-1" /> Upcoming
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-10 w-full">
        <p>Built for Bharat | Powered by Students</p>
      </footer>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')]"></div>
      </div>
    </motion.div>
  )
}

export default BusDetailsPage
