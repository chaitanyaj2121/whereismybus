import React, { useState, useEffect } from "react"
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { auth, db } from "../firebase/config"
import {
  MapPin,
  Play,
  Check,
  Clock,
  Bus,
  Navigation,
  Square,
  AlertCircle,
} from "lucide-react"

const RouteTracker = ({ busData, routeData, onRouteUpdate }) => {
  const [activeSession, setActiveSession] = useState(null)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [isRouteActive, setIsRouteActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  // Check for active session on component mount
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!auth.currentUser || !busData) {
        setSessionLoading(false)
        return
      }

      try {
        const sessionQuery = query(
          collection(db, "driverSessions"),
          where("driverId", "==", auth.currentUser.uid),
          where("busId", "==", busData.id),
          where("isActive", "==", true)
        )

        const unsubscribe = onSnapshot(sessionQuery, (snapshot) => {
          if (!snapshot.empty) {
            const sessionData = snapshot.docs[0].data()
            const session = { id: snapshot.docs[0].id, ...sessionData }
            setActiveSession(session)
            setCurrentStopIndex(session.currentStopIndex || 0)
            setIsRouteActive(true)
          } else {
            setActiveSession(null)
            setIsRouteActive(false)
            setCurrentStopIndex(0)
          }
          setSessionLoading(false)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error checking active session:", error)
        setSessionLoading(false)
      }
    }

    checkActiveSession()
  }, [busData])

  // Start route tracking
  const startRoute = async () => {
    if (!auth.currentUser || !busData || !routeData) {
      alert("Missing required data to start route")
      return
    }

    try {
      setLoading(true)

      // Create a new driver session
      const sessionData = {
        driverId: auth.currentUser.uid,
        busId: busData.id,
        routeId: routeData.id,
        routeName: routeData.routeName,
        stops: routeData.stops,
        currentStopIndex: 0,
        isActive: true,
        startTime: serverTimestamp(),
        progress: {
          0: {
            stopName: routeData.stops[0],
            status: "started",
            startedAt: serverTimestamp(),
          },
        },
      }

      const docRef = await addDoc(collection(db, "driverSessions"), sessionData)

      // Update bus current stop
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        currentStop: routeData.stops[0],
        lastUpdated: serverTimestamp(),
        sessionId: docRef.id,
      })

      // Call parent update function if provided
      if (onRouteUpdate) {
        onRouteUpdate()
      }

      alert(`Route "${routeData.routeName}" started successfully!`)
    } catch (error) {
      console.error("Error starting route:", error)
      alert("Failed to start route. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Mark arrival at current stop
  const markArrival = async () => {
    if (!activeSession || !busData || !routeData) return

    try {
      setLoading(true)
      const nextStopIndex = currentStopIndex + 1
      const isLastStop = nextStopIndex >= routeData.stops.length

      // Update the driver session
      const sessionRef = doc(db, "driverSessions", activeSession.id)

      const updateData = {
        currentStopIndex: nextStopIndex,
        [`progress.${currentStopIndex}.arrivedAt`]: serverTimestamp(),
        [`progress.${currentStopIndex}.status`]: "completed",
      }

      // If not the last stop, add next stop to progress
      if (!isLastStop) {
        updateData[`progress.${nextStopIndex}`] = {
          stopName: routeData.stops[nextStopIndex],
          status: "current",
          startedAt: serverTimestamp(),
        }
      } else {
        // Mark route as completed
        updateData.isActive = false
        updateData.completedAt = serverTimestamp()
      }

      await updateDoc(sessionRef, updateData)

      // Update bus current stop
      const busRef = doc(db, "buses", busData.id)
      const busUpdateData = {
        lastUpdated: serverTimestamp(),
        arrivedAt: serverTimestamp(),
      }

      if (!isLastStop) {
        busUpdateData.currentStop = routeData.stops[nextStopIndex]
      } else {
        busUpdateData.currentStop = null
        busUpdateData.sessionId = null
      }

      await updateDoc(busRef, busUpdateData)

      // REMOVED: Creation of arrival record in arrivals collection
      // The arrival information is now only stored in the session progress

      // Call parent update function if provided
      if (onRouteUpdate) {
        onRouteUpdate()
      }

      if (isLastStop) {
        alert("Route completed successfully!")
      } else {
        alert(
          `Arrived at ${routeData.stops[currentStopIndex]}. Next stop: ${routeData.stops[nextStopIndex]}`
        )
      }
    } catch (error) {
      console.error("Error marking arrival:", error)
      alert("Failed to mark arrival. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // End current route
  const endRoute = async () => {
    if (
      !activeSession ||
      !window.confirm("Are you sure you want to end this route?")
    )
      return

    try {
      setLoading(true)
      const sessionRef = doc(db, "driverSessions", activeSession.id)
      await updateDoc(sessionRef, {
        isActive: false,
        endedAt: serverTimestamp(),
        endedEarly: true,
      })

      // Update bus
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        currentStop: null,
        sessionId: null,
        lastUpdated: serverTimestamp(),
      })

      // Call parent update function if provided
      if (onRouteUpdate) {
        onRouteUpdate()
      }

      alert("Route ended successfully!")
    } catch (error) {
      console.error("Error ending route:", error)
      alert("Failed to end route. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading route tracker...</span>
        </div>
      </div>
    )
  }

  if (!busData || !routeData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Bus and route setup required</p>
          <p className="text-sm text-gray-500 mt-1">
            Please set up your bus and assign a route to start tracking
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Navigation className="w-5 h-5 mr-2" />
          Route Tracker
        </h2>
        <div className="flex items-center space-x-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isRouteActive ? "bg-green-500" : "bg-gray-400"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {isRouteActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Route Information */}
      <div className="mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Route: {routeData.routeName}
          </h3>
          <p className="text-sm text-blue-700 mb-2">
            Bus: {busData.busNumber} ({busData.busModel})
          </p>
          <p className="text-sm text-blue-700">
            Total Stops: {routeData.stops.length}
          </p>
        </div>
      </div>

      {/* Active Route Section */}
      {isRouteActive && activeSession ? (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">
                {currentStopIndex + 1} of {routeData.stops.length} stops
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentStopIndex + 1) / routeData.stops.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* Current Stop */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  {currentStopIndex < routeData.stops.length
                    ? `Current Stop: ${routeData.stops[currentStopIndex]}`
                    : "Route Completed"}
                </p>
                <p className="text-sm text-green-700">
                  {currentStopIndex < routeData.stops.length - 1
                    ? `Next: ${routeData.stops[currentStopIndex + 1]}`
                    : currentStopIndex < routeData.stops.length
                    ? "Final stop"
                    : "All stops completed"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {currentStopIndex < routeData.stops.length && (
              <button
                onClick={markArrival}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Check className="h-5 w-5" />
                <span>
                  {loading
                    ? "Processing..."
                    : currentStopIndex === routeData.stops.length - 1
                    ? "Complete Route"
                    : `Mark Arrival`}
                </span>
              </button>
            )}

            <button
              onClick={endRoute}
              disabled={loading}
              className="bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Square className="h-5 w-5" />
              <span>End Route</span>
            </button>
          </div>

          {/* All Stops Progress */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Route Progress</h3>
            <div className="space-y-2">
              {routeData.stops.map((stop, index) => (
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
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">Completed</span>
                    </div>
                  )}
                  {index === currentStopIndex && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-blue-600">Current</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Start Route Section */
        <div className="text-center space-y-4">
          <div className="bg-gray-50 rounded-lg p-6">
            <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Ready to start route tracking</p>
            <p className="text-sm text-gray-500">
              Click the button below to begin tracking your route progress
            </p>
          </div>

          <button
            onClick={startRoute}
            disabled={loading}
            className="bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <Play className="h-5 w-5" />
            <span>{loading ? "Starting..." : "Start Route"}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default RouteTracker
