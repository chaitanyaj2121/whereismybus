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
  Check,
  Square,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Loading live bus details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-red-300">
          <p className="text-red-600 text-xl font-semibold mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl
                       hover:bg-blue-700 transition duration-300 shadow-md"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Results
          </button>
        </div>
      </div>
    )
  }

  if (!sessionData || !busDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-orange-300">
          <p className="text-orange-600 text-xl font-semibold mb-4">
            Bus session not found or has ended.
          </p>
          <p className="text-gray-600 mb-6">
            This bus might not be active on its route right now.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl
                       hover:bg-blue-700 transition duration-300 shadow-md"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Results
          </button>
        </div>
      </div>
    )
  }

  const stops = sessionData.stops || []
  const currentStopIndex = sessionData.currentStopIndex || 0
  const progress = sessionData.progress || {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 lg:p-10 flex flex-col"
    >
      {/* Header */}
      <header className="text-center mb-8 lg:mb-12">
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 shadow-sm text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        <div className="flex justify-center mb-4">
          <Bus className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Live Bus Tracking
        </h1>
        <p className="text-lg lg:text-xl font-light text-gray-600">
          Route: <span className="font-semibold">{sessionData.routeName}</span>
        </p>
        <p className="text-md text-gray-500">
          Bus: <span className="font-semibold">{busDetails.busNumber}</span> (
          {busDetails.busModel})
        </p>
      </header>

      {/* Live Status Section */}
      <main className="flex-grow flex items-start justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 lg:p-8 backdrop-blur-sm bg-opacity-80">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <MapPin className="h-6 w-6 mr-2 text-blue-600" /> Current Status
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-lg font-semibold text-blue-800 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Current Stop: {stops[currentStopIndex] || "N/A"}
              </p>
              {currentStopIndex < stops.length - 1 && (
                <p className="text-md text-blue-700 mt-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  Next Stop: {stops[currentStopIndex + 1]}
                </p>
              )}
              <p className="text-md text-blue-700 mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Started At:{" "}
                {sessionData.startTime?.toDate().toLocaleTimeString() || "N/A"}
              </p>
              <p className="text-md text-blue-700 mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Last Updated:{" "}
                {sessionData.progress?.[currentStopIndex]?.startedAt
                  ?.toDate()
                  .toLocaleTimeString() || "N/A"}
              </p>
            </div>
          </div>

          {/* Route Progress */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <Play className="h-6 w-6 mr-2 text-green-600" /> Route Progress
            </h2>
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    index < currentStopIndex
                      ? "bg-green-50 border-green-200"
                      : index === currentStopIndex
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full ${
                      index < currentStopIndex
                        ? "bg-green-500"
                        : index === currentStopIndex
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span
                    className={`font-medium flex-1 ${
                      index < currentStopIndex
                        ? "text-green-900"
                        : index === currentStopIndex
                        ? "text-blue-900"
                        : "text-gray-600"
                    }`}
                  >
                    {stop}
                  </span>
                  {index < currentStopIndex && (
                    <div className="flex items-center text-xs text-green-600">
                      <Check className="h-4 w-4 mr-1" /> Completed
                    </div>
                  )}
                  {index === currentStopIndex && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Clock className="h-4 w-4 mr-1" /> Current
                    </div>
                  )}
                  {index > currentStopIndex && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Square className="h-4 w-4 mr-1" /> Pending
                    </div>
                  )}
                </div>
              ))}
            </div>
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

export default BusDetailsPage
