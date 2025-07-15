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
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-10"
    >
      {/* Header */}
      <header className="text-center mb-8 lg:mb-12">
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white p-4 rounded-2xl shadow-lg ring-1 ring-slate-200">
            <Bus className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
          </div>
        </motion.div>
        <motion.h1
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Bus Search Results
        </motion.h1>
        <motion.div
          className="inline-block bg-white/60 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-sm ring-1 ring-slate-200"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-base sm:text-lg font-medium text-slate-700">
            From:{" "}
            <span className="font-semibold text-blue-700 capitalize">
              {from}
            </span>
            <span className="mx-2 text-slate-400">→</span>
            <span className="font-semibold text-blue-700 capitalize">{to}</span>
          </p>
        </motion.div>
      </header>

      {/* Results Section */}
      <main className="flex justify-center px-2 sm:px-4">
        <div className="w-full max-w-4xl">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl ring-1 ring-slate-200 p-6 sm:p-8">
            {loadingSessions ? (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                </div>
                <p className="text-slate-600 text-lg font-medium">
                  Checking for matching buses...
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Please wait while we find the best routes for you
                </p>
              </motion.div>
            ) : foundRoutesWithSession.length > 0 ? (
              <div className="space-y-6">
                {foundRoutesWithSession.map((route, index) => (
                  <motion.div
                    key={`${route.id}-${
                      route.matchingSession?.sessionId || "no-session"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={`group relative overflow-hidden rounded-2xl p-6 shadow-lg ring-1 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] focus-within:ring-2 focus-within:ring-blue-500
                      ${
                        route.matchingSession
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 ring-emerald-200 hover:from-emerald-100 hover:to-green-100"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 ring-slate-200 hover:from-slate-100 hover:to-gray-100"
                      }`}
                  >
                    {/* Status indicator */}
                    <div
                      className={`absolute top-0 right-0 w-2 h-full ${
                        route.matchingSession
                          ? "bg-emerald-400"
                          : "bg-slate-300"
                      }`}
                    ></div>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Route Information */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                            {route.routeName}
                          </h3>
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin className="h-4 w-4 mt-0.5 text-slate-500 flex-shrink-0" />
                            <p className="text-sm sm:text-base font-medium">
                              {route.stops.join(" → ")}
                            </p>
                          </div>
                        </div>

                        {route.matchingSession ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <Bus className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium">
                                  Bus: {route.matchingSession.busNumber} (
                                  {route.matchingSession.busModel})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-700">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium">
                                  पुढील स्टॉप:{" "}
                                  {route.matchingSession.currentStopName} (Stop{" "}
                                  {route.matchingSession.currentStopIndex + 1})
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <Clock className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium">
                                  Started:{" "}
                                  {formatTime(route.matchingSession.startTime)}
                                </span>
                              </div>
                              <div
                                className={`flex items-center gap-2 ${
                                  route.matchingSession.isActive
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    route.matchingSession.isActive
                                      ? "bg-emerald-500 animate-pulse"
                                      : "bg-amber-500"
                                  }`}
                                ></div>
                                <span className="text-sm font-semibold">
                                  {route.matchingSession.isActive
                                    ? "बस चालू आहे"
                                    : "Journey completed"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium">
                              Bus has not started yet
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Section */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 lg:text-right">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm ring-1 ring-slate-200">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium">
                              Scheduled
                            </span>
                          </div>
                          <div className="text-lg font-bold text-slate-800 mt-1">
                            {route.staticDepartureTime || "N/A"}
                          </div>
                        </div>

                        {route.matchingSession && (
                          <button
                            onClick={() =>
                              handleViewDetails(route.matchingSession.sessionId)
                            }
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white group"
                          >
                            <Info className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
                            <span>View Live Details</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-2xl mb-6">
                  <Bus className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  No buses found
                </h3>
                <p className="text-slate-600 text-lg mb-2">
                  We couldn't find any buses for this route at the moment.
                </p>
                <p className="text-slate-500">
                  Please try a different source or destination, or check back
                  later.
                </p>
              </motion.div>
            )}

            {/* Back to Search Button */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <button
                onClick={handleBackToSearch}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-2xl shadow-lg hover:from-slate-800 hover:to-slate-900 hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-white group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
                <span>Back to Search</span>
              </button>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center mt-12 mb-6">
        <div className="inline-block bg-white/40 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-600 text-sm font-medium">
            Built for Bharat | Powered by Students
          </p>
        </div>
      </footer>

      {/* Enhanced Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
      </div>
    </motion.div>
  )
}

export default SearchResultsPage
