import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Bus, Clock, MapPin, ArrowLeft, Info } from "lucide-react"

// Import Firebase Firestore modules
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore"
import { db } from "../firebase/config" // Assuming firebase/config exports 'db'

const SearchResultsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [foundRoutesWithSession, setFoundRoutesWithSession] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    const setupRealtimeListeners = async () => {
      setLoadingSessions(true)
      const initialRoutes = location.state?.routes || []
      setFrom(location.state?.from || "")
      setTo(location.state?.to || "")

      if (initialRoutes.length === 0) {
        setFoundRoutesWithSession([])
        setLoadingSessions(false)
        console.log("No initial routes passed to SearchResultsPage.")
        return
      }

      console.log("Initial routes received:", initialRoutes)

      try {
        const sessionsRef = collection(db, "busRouteSessions")
        const busesRef = collection(db, "buses")

        // Set up real-time listener for bus route sessions
        const unsubscribeSessions = onSnapshot(
          sessionsRef,
          async (snapshot) => {
            console.log("Real-time update received for sessions")

            const allSessionsMap = new Map()
            snapshot.forEach((doc) => {
              const session = { id: doc.id, ...doc.data() }
              const key = `${session.routeId}_${session.driverId}`
              allSessionsMap.set(key, session)
              console.log(`Mapped session: Key=${key}, SessionData=`, session)
            })
            console.log(
              "Total sessions fetched and mapped:",
              allSessionsMap.size
            )

            const routesWithSessionData = []
            for (const route of initialRoutes) {
              const key = `${route.id}_${route.createdBy}`
              console.log(
                `Attempting to match route: RouteName=${route.routeName}, RouteID=${route.id}, CreatedBy=${route.createdBy}. Constructed Key=${key}`
              )
              const matchingSession = allSessionsMap.get(key)

              if (matchingSession) {
                console.log(
                  `MATCH FOUND for route ${route.routeName}. Matching Session:`,
                  matchingSession
                )

                // Fetch bus details for display
                const busDocRef = doc(db, "buses", matchingSession.busId)
                const busDocSnap = await getDoc(busDocRef)
                let busDetails = null
                if (busDocSnap.exists()) {
                  busDetails = busDocSnap.data()
                  console.log(
                    `Fetched bus details for busId ${matchingSession.busId}:`,
                    busDetails
                  )
                } else {
                  console.warn(
                    `Bus details not found for busId: ${matchingSession.busId}`
                  )
                }

                // Get current stop name from session progress
                const currentStopName =
                  matchingSession.progress?.[matchingSession.currentStopIndex]
                    ?.stopName || "Unknown"

                // Get session start time
                const startTime =
                  matchingSession.startTime?.toDate?.() ||
                  new Date(matchingSession.startTime)

                routesWithSessionData.push({
                  ...route,
                  matchingSession: {
                    ...matchingSession,
                    busNumber: busDetails?.busNumber || "N/A",
                    busModel: busDetails?.busModel || "N/A",
                    currentStopName,
                    startTime,
                    sessionId: matchingSession.id,
                    routeName: matchingSession.routeName,
                    stops: matchingSession.stops || [],
                    progress: matchingSession.progress || {},
                    currentStopIndex: matchingSession.currentStopIndex || 0,
                    isActive: matchingSession.isActive || false,
                    busId: matchingSession.busId,
                    driverId: matchingSession.driverId,
                  },
                })
              } else {
                console.log(
                  `NO MATCHING SESSION found for route ${route.routeName}. Key searched: ${key}`
                )
                routesWithSessionData.push({
                  ...route,
                  matchingSession: null,
                })
              }
            }
            setFoundRoutesWithSession(routesWithSessionData)
            setLoadingSessions(false)
          },
          (error) => {
            console.error("Error in real-time sessions listener:", error)
            setLoadingSessions(false)
          }
        )

        // Set up real-time listener for buses collection to update bus details
        const unsubscribeBuses = onSnapshot(
          busesRef,
          (snapshot) => {
            console.log("Real-time update received for buses")
            // This will trigger a re-evaluation of sessions which will fetch updated bus details
            // The sessions listener will handle the bus details update
          },
          (error) => {
            console.error("Error in real-time buses listener:", error)
          }
        )

        // Return cleanup function
        return () => {
          console.log("Cleaning up real-time listeners")
          unsubscribeSessions()
          unsubscribeBuses()
        }
      } catch (error) {
        console.error("Error setting up real-time listeners:", error)
        setFoundRoutesWithSession(
          initialRoutes.map((route) => ({ ...route, matchingSession: null }))
        )
        setLoadingSessions(false)
      }
    }

    // Setup listeners and store cleanup function
    let cleanup
    setupRealtimeListeners().then((cleanupFn) => {
      cleanup = cleanupFn
    })

    // Cleanup on component unmount
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [location.state])

  const handleViewDetails = (sessionId) => {
    navigate(`/busDetails/${sessionId}`)
  }

  const handleBackToSearch = () => {
    navigate("/search")
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
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
          {loadingSessions ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking for matching buses...</p>
            </div>
          ) : foundRoutesWithSession.length > 0 ? (
            <div className="space-y-6">
              {foundRoutesWithSession.map((route, index) => (
                <motion.div
                  key={`${route.id}-${
                    route.matchingSession?.sessionId || "no-session"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`border rounded-xl p-5 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 transition-all duration-300
                    ${
                      route.matchingSession
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      Route: {route.routeName}
                    </h3>
                    <p className="text-gray-700 text-sm flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                      Stops: {route.stops.join(" → ")}
                    </p>
                    {route.matchingSession ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-green-700 text-sm flex items-center">
                          <Bus className="h-4 w-4 mr-2 text-green-600" />
                          Bus: {route.matchingSession.busNumber} (
                          {route.matchingSession.busModel})
                        </p>
                        <p className="text-green-700 text-sm flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-green-600" />
                          Current Stop: {
                            route.matchingSession.currentStopName
                          }{" "}
                          (Stop {route.matchingSession.currentStopIndex + 1})
                        </p>
                        <p className="text-green-700 text-sm flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-green-600" />
                          Started: {formatTime(route.matchingSession.startTime)}
                        </p>
                        <p
                          className={`text-sm flex items-center ${
                            route.matchingSession.isActive
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Status:{" "}
                          {route.matchingSession.isActive
                            ? "बस चालू आहे  "
                            : "Journey completed   "}
                        </p>
                        <div className="text-xs text-gray-600 mt-2">
                          {/* Debug info commented out */}
                          {/* <p>
                            <strong>Driver ID:</strong>{" "}
                            {route.matchingSession.driverId}
                          </p>
                          <p>
                            <strong>Route Created By:</strong> {route.createdBy}
                          </p>
                          <p>
                            <strong>Bus ID:</strong>{" "}
                            {route.matchingSession.busId}
                          </p>
                          <p>
                            <strong>Session ID:</strong>{" "}
                            {route.matchingSession.sessionId}
                          </p> */}
                        </div>
                      </div>
                    ) : (
                      <p className="text-orange-600 text-sm flex items-center mt-2">
                        <Clock className="h-4 w-4 mr-2 text-orange-500" />
                        Bus is not started yet
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2 sm:ml-4">
                    <div className="flex items-center text-gray-700 font-semibold text-lg">
                      <Clock className="h-5 w-5 mr-2" />
                      {route.staticDepartureTime || "N/A"} (Static)
                    </div>
                    {route.matchingSession && (
                      <button
                        onClick={() =>
                          handleViewDetails(route.matchingSession.sessionId)
                        }
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
                                   hover:bg-blue-700 transition duration-300 shadow-md text-sm"
                      >
                        <Info className="h-4 w-4 mr-2" />
                        View Live Details
                      </button>
                    )}
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
