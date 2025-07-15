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
  CheckCircle2,
  CircleDot,
  Circle,
} from "lucide-react"

// Import Firebase Firestore modules
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config" // Assuming firebase/config exports 'db'

const BusDetailsPage = () => {
  const { sessionId } = useParams()
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
        const busDocRef = doc(db, "buses", sessionId)
        const busDocSnap = await getDoc(busDocRef)
        if (busDocSnap.exists()) {
          setBusDetails(busDocSnap.data())
        } else {
          setError("Bus details not found.")
          setLoading(false)
          return
        }

        const sessionDocRef = doc(db, "busRouteSessions", sessionId)
        const unsubscribe = onSnapshot(
          sessionDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setSessionData(snapshot.data())
              setLoading(false)
            } else {
              setError("Stopped due to some issue")
              setSessionData(null)
              setLoading(false)
            }
          },
          (err) => {
            console.error("Error listening to bus session:", err)
            setError(`Failed to load live data: ${err.message}`)
            setLoading(false)
          }
        )

        return () => unsubscribe()
      } catch (err) {
        console.error("Error fetching initial bus or session data:", err)
        setError(`Failed to load bus details: ${err.message}`)
        setLoading(false)
      }
    }

    fetchBusAndSessionData()
  }, [sessionId])

  const handleBack = () => {
    navigate(-1)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50"
        >
          <Loader2 className="h-20 w-20 animate-spin text-blue-600 mx-auto mb-8" />
          <p className="text-gray-700 text-xl font-medium tracking-wide">
            Loading live bus details...
          </p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-red-200/50 max-w-lg"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CircleDot className="h-10 w-10 text-red-600" />
          </div>
          <p className="text-red-600 text-2xl font-bold mb-4">{error}</p>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Please try again or check your internet connection.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl
                         hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-orange-200/50 max-w-lg"
        >
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bus className="h-10 w-10 text-orange-600" />
          </div>
          <p className="text-orange-600 text-2xl font-bold mb-4">
            Bus session not found or has ended.
          </p>
          <p className="text-gray-600 mb-8 leading-relaxed">
            This bus might not be active on its route right now, or the session
            has concluded.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl
                         hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105
                         focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50"
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
  const progress = sessionData.progress || {}

  const formatTime = (timestampValue) => {
    if (!timestampValue) return "N/A"

    let date

    // Firestore Timestamp
    if (typeof timestampValue.toDate === "function") {
      date = timestampValue.toDate()
    }
    // Native Date object
    else if (timestampValue instanceof Date) {
      date = timestampValue
    }
    // Custom string like "July 13, 2025 at 9:51:22 PM UTC+5:30"
    else if (typeof timestampValue === "string") {
      try {
        // Handle the specific format: "July 13, 2025 at 10:09:48 PM UTC+5:30"
        if (
          timestampValue.includes(" at ") &&
          timestampValue.includes(" UTC")
        ) {
          // Split by " at " to separate date and time parts
          const parts = timestampValue.split(" at ")
          if (parts.length === 2) {
            const datePart = parts[0] // "July 13, 2025"
            const timePart = parts[1] // "10:09:48 PM UTC+5:30"

            // Remove the UTC timezone part from time
            const timeWithoutUTC = timePart.replace(/ UTC.*$/, "").trim() // "10:09:48 PM"

            // Combine date and time
            const dateTimeString = `${datePart} ${timeWithoutUTC}` // "July 13, 2025 10:09:48 PM"

            date = new Date(dateTimeString)
          } else {
            // Fallback: try direct parsing
            date = new Date(timestampValue)
          }
        } else {
          // For other string formats, try direct parsing
          date = new Date(timestampValue)
        }
      } catch (error) {
        console.error("Error parsing timestamp:", timestampValue, error)
        return "N/A"
      }
    } else {
      return "N/A"
    }

    // Invalid Date check
    if (isNaN(date.getTime())) {
      console.error("Invalid date created from:", timestampValue)
      return "N/A"
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Helper function to get the appropriate time for each stop based on its status
  const getStopTime = (index) => {
    if (index < currentStopIndex) {
      // Completed stop - try completedAt first, then arrivedAt, then startedAt as fallback
      return formatTime(
        progress[index]?.completedAt ||
          progress[index]?.arrivedAt ||
          progress[index]?.startedAt
      )
    } else if (index === currentStopIndex) {
      // Current stop - show when it started
      return formatTime(progress[index]?.startedAt)
    }
    // Future stops don't have a time yet
    return null
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 pb-16 sm:p-6 lg:p-10 flex flex-col items-center relative overflow-x-hidden"
    >
      {/* Back Button - Positioned top-left */}
      <motion.button
        onClick={handleBack}
        className="absolute top-6 left-6 sm:top-8 sm:left-8 inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-md text-gray-800 rounded-2xl hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 transform hover:scale-105 group"
        variants={itemVariants}
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
        Back
      </motion.button>

      {/* Header */}
      <motion.header
        className="text-center mt-20 mb-10 sm:mb-12 lg:mb-16 max-w-2xl w-full px-4"
        variants={sectionVariants}
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl">
            <Bus className="h-16 w-16 text-white" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 mb-4">
          Live Bus Tracking
        </h1>
        <div className="space-y-2">
          <p className="text-xl sm:text-2xl font-medium text-gray-700">
            Route:{" "}
            <span className="font-bold text-blue-700">
              {sessionData.routeName}
            </span>
          </p>
          <p className="text-lg sm:text-xl text-gray-600">
            Bus:{" "}
            <span className="font-semibold text-gray-800">
              {busDetails.busNumber}
            </span>
            <span className="text-gray-500 font-normal">
              {" "}
              • {busDetails.busModel}
            </span>
          </p>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main
        className="w-full max-w-4xl space-y-8 sm:space-y-10 px-4 sm:px-0"
        variants={sectionVariants}
      >
        {/* Live Status Section */}
        <motion.div
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/50 relative overflow-hidden"
          variants={itemVariants}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 flex items-center relative z-10">
            <div className="p-3 bg-blue-100 rounded-2xl mr-4">
              <MapPin className="h-7 w-7 text-blue-600" />
            </div>
            Current Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg relative z-10">
            <div className="bg-blue-50/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-100">
              <p className="font-semibold text-blue-900 flex items-center">
                <CircleDot className="h-6 w-6 mr-3 text-blue-600 animate-pulse" />
                पुढील स्टॉप : {stops[currentStopIndex] || "N/A"}
              </p>
            </div>
            <div className="bg-indigo-50/50 backdrop-blur-sm p-6 rounded-2xl border border-indigo-100">
              <p className="text-indigo-900 font-medium flex items-center">
                <Play className="h-6 w-6 mr-3 text-indigo-600" />
                पहिल्या स्टॉप वरुन निघालेली वेळ :{" "}
                {formatTime(sessionData.startTime)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Route Progress */}
        <motion.div
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/50 relative overflow-hidden"
          variants={itemVariants}
        >
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-green-400/10 to-emerald-400/10 rounded-full blur-3xl -ml-48 -mb-48"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 flex items-center relative z-10">
            <div className="p-3 bg-green-100 rounded-2xl mr-4">
              <Bus className="h-7 w-7 text-green-600" />
            </div>
            Route Progress
          </h2>
          <div className="space-y-4 relative z-10">
            {stops.map((stop, index) => {
              const stopTime = getStopTime(index)

              return (
                <motion.div
                  key={index}
                  className={`group flex items-center space-x-4 p-5 rounded-2xl transition-all duration-500 transform hover:scale-[1.02]
                    ${
                      index < currentStopIndex
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-md hover:shadow-lg"
                        : index === currentStopIndex
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-xl hover:shadow-2xl"
                        : "bg-gray-50/70 border border-gray-200 hover:bg-gray-100/70 hover:shadow-md"
                    }`}
                  variants={itemVariants}
                >
                  <div
                    className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300
                      ${
                        index < currentStopIndex
                          ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                          : index === currentStopIndex
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg animate-pulse"
                          : "bg-gray-300 text-gray-600 group-hover:bg-gray-400"
                      }`}
                  >
                    {index < currentStopIndex ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : index === currentStopIndex ? (
                      <CircleDot className="h-5 w-5" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`font-medium text-lg tracking-wide
                        ${
                          index < currentStopIndex
                            ? "text-green-900"
                            : index === currentStopIndex
                            ? "text-blue-900 font-bold text-xl"
                            : "text-gray-700"
                        }`}
                    >
                      {stop}
                    </span>

                    {/* Time display for each stop */}
                    <div className="flex items-center text-sm font-medium">
                      {index < currentStopIndex && stopTime && (
                        <div className="flex items-center text-green-700 bg-green-100/50 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {stopTime} ला पोहोचली
                        </div>
                      )}

                      {index === currentStopIndex && (
                        <div className="flex items-center text-blue-700 bg-blue-100/50 px-3 py-1.5 rounded-xl">
                          <Clock className="h-4 w-4 mr-2 animate-pulse" />
                          {stopTime ? `येत आहे ` : "Current Location"}
                        </div>
                      )}

                      {index > currentStopIndex && (
                        <div className="flex items-center text-gray-500 bg-gray-100/50 px-3 py-1.5 rounded-xl">
                          <Circle className="h-4 w-4 mr-2" />
                          Upcoming
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="text-center text-gray-600 text-sm mt-16 w-full space-y-2">
        <p className="font-medium">Built for Bharat | Powered by Students</p>
        <p className="text-xs text-gray-500">© 2025 Bus Tracking System</p>
      </footer>

      {/* Enhanced Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgwLDAsMCwwLjAyKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-50"></div>
      </div>
    </motion.div>
  )
}

export default BusDetailsPage
