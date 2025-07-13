import React, { useState, useEffect } from "react"
import {
  // Re-added: Used for collection reference implicitly by doc()
  doc,
  updateDoc,
  onSnapshot,
  setDoc, // Used for creating/overwriting session with busId as doc ID
  deleteDoc,
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
  X, // Added for modal close button
} from "lucide-react"

const RouteTracker = ({ busData, routeData, onRouteUpdate }) => {
  const [activeSession, setActiveSession] = useState(null)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [isRouteActive, setIsRouteActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalConfirmAction, setModalConfirmAction] = useState(null)

  // Function to show custom alert/error modal
  const showAlert = (message) => {
    setModalMessage(message)
    setShowModal(true)
    setModalConfirmAction(null) // Not a confirmation, just an alert
  }

  // Function to show custom confirmation modal
  const showConfirm = (message, onConfirm) => {
    setModalMessage(message)
    setShowModal(true)
    setModalConfirmAction(() => onConfirm) // Store the action to be called on confirm
  }

  const closeModal = () => {
    setShowModal(false)
    setModalMessage("")
    setModalConfirmAction(null)
  }

  // Effect to check for and listen to an active session for the current bus
  useEffect(() => {
    const checkActiveSession = async () => {
      // Ensure busData and auth.currentUser are available
      if (!auth.currentUser || !busData || !busData.id) {
        setSessionLoading(false)
        return
      }

      try {
        // Reference to the specific session document for this bus
        const sessionDocRef = doc(db, "busRouteSessions", busData.id)

        // Listen for real-time updates on this specific document
        const unsubscribe = onSnapshot(
          sessionDocRef,
          (snapshot) => {
            if (snapshot.exists() && snapshot.data().isActive) {
              const sessionData = snapshot.data()
              const session = { id: snapshot.id, ...sessionData } // snapshot.id will be busData.id
              setActiveSession(session)
              setCurrentStopIndex(session.currentStopIndex || 0)
              setIsRouteActive(true)
            } else {
              // No active session found for this bus
              setActiveSession(null)
              setIsRouteActive(false)
              setCurrentStopIndex(0)
            }
            setSessionLoading(false)
          },
          (error) => {
            console.error("Error listening to active session:", error)
            showAlert(`Error listening to session: ${error.message}`)
            setSessionLoading(false)
          }
        )

        return () => unsubscribe() // Cleanup the listener on unmount
      } catch (error) {
        console.error("Error setting up active session listener:", error)
        showAlert(`Error setting up session listener: ${error.message}`)
        setSessionLoading(false)
      }
    }

    checkActiveSession()
  }, [busData]) // Re-run if busData changes (e.g., bus is assigned)

  // Start route tracking
  const startRoute = async () => {
    if (!auth.currentUser || !busData || !busData.id || !routeData) {
      showAlert(
        "Missing required data to start route (Bus or Route not assigned)."
      )
      return
    }

    try {
      setLoading(true)

      // Create a new driver session document with busData.id as its ID
      const sessionData = {
        driverId: auth.currentUser.uid, // This should match request.auth.uid in rules
        busId: busData.id, // This should match request.resource.id and resource.data.busId in rules
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

      console.log("Attempting to start route with sessionData:", sessionData)
      console.log("Authenticated User UID:", auth.currentUser.uid)
      console.log("Bus ID:", busData.id)

      // Use setDoc to create/overwrite a document with busData.id as the document ID
      const sessionDocRef = doc(db, "busRouteSessions", busData.id)
      await setDoc(sessionDocRef, sessionData)

      // Update bus document to link to this session
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        currentStop: routeData.stops[0],
        lastUpdated: serverTimestamp(),
        sessionId: busData.id, // Link bus to its active session by its ID
      })

      // Call parent update function if provided
      if (onRouteUpdate) {
        onRouteUpdate()
      }

      showAlert(`Route "${routeData.routeName}" started successfully!`)
    } catch (error) {
      console.error("Error starting route:", error)
      showAlert(`Failed to start route: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  // Mark arrival at current stop
  const markArrival = async () => {
    if (!activeSession || !busData || !busData.id || !routeData) return

    try {
      setLoading(true)
      const nextStopIndex = currentStopIndex + 1
      const isLastStop = nextStopIndex >= routeData.stops.length

      // Reference to the active session document for this bus
      const sessionRef = doc(db, "busRouteSessions", busData.id)

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
        // Mark route as completed in the session
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
        busUpdateData.sessionId = null // Clear session ID from bus when route completes
      }

      await updateDoc(busRef, busUpdateData)

      // Call parent update function if provided
      if (onRouteUpdate) {
        onRouteUpdate()
      }

      if (isLastStop) {
        showAlert("Route completed successfully!")
      } else {
        showAlert(
          `Arrived at ${routeData.stops[currentStopIndex]}. Next stop: ${routeData.stops[nextStopIndex]}`
        )
      }
    } catch (error) {
      console.error("Error marking arrival:", error)
      showAlert(`Failed to mark arrival: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  // End current route
  const endRoute = async () => {
    if (!activeSession || !busData || !busData.id) return // No need for window.confirm here anymore

    showConfirm("Are you sure you want to end this route?", async () => {
      try {
        setLoading(true)
        // Delete the active session document for this bus
        const sessionRef = doc(db, "busRouteSessions", busData.id)
        await deleteDoc(sessionRef)

        // Update bus to clear current route and session
        const busRef = doc(db, "buses", busData.id)
        await updateDoc(busRef, {
          currentStop: null,
          sessionId: null, // Clear session ID from bus
          lastUpdated: serverTimestamp(),
        })

        // Call parent update function if provided
        if (onRouteUpdate) {
          onRouteUpdate()
        }

        showAlert("Route ended successfully!")
      } catch (error) {
        console.error("Error ending route:", error)
        showAlert(`Failed to end route: ${error.message}. Please try again.`)
      } finally {
        setLoading(false)
        closeModal() // Close modal after action
      }
    })
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

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalConfirmAction ? "Confirm Action" : "Notification"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-6">{modalMessage}</p>
            <div className="flex justify-end space-x-3">
              {modalConfirmAction && (
                <button
                  onClick={() => {
                    modalConfirmAction()
                    closeModal() // Close after confirming and executing action
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Confirm
                </button>
              )}
              <button
                onClick={closeModal}
                className={`px-4 py-2 rounded-lg font-medium ${
                  modalConfirmAction
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {modalConfirmAction ? "Cancel" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RouteTracker
