import React, { useEffect, useState } from "react"
import RouteTracker from "./RouteTracker"
import { useNavigate } from "react-router-dom"

import {
  LogOut,
  MapPin,
  Clock,
  Route,
  Plus,
  X,
  Save,
  Trash2,
  Bus,
  Navigation,
  Settings,
  Map,
  Activity,
} from "lucide-react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"
import { auth, db } from "../firebase/config"

const DriverDashboard = () => {
  const [user, setUser] = useState(null)
  const [busData, setBusData] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateRoute, setShowCreateRoute] = useState(false)
  const [showBusSetup, setShowBusSetup] = useState(false)
  // const [showRouteTracker, setShowRouteTracker] = useState(false)
  const [newRoute, setNewRoute] = useState({
    routeName: "",
    stops: [""],
  })
  const [newBus, setNewBus] = useState({
    busNumber: "",
    busModel: "",
    capacity: "",
  })
  const [userRoutes, setUserRoutes] = useState([])
  const [creatingRoute, setCreatingRoute] = useState(false)
  const [creatingBus, setCreatingBus] = useState(false)
  const [markingStop, setMarkingStop] = useState(null)
  const [activeView, setActiveView] = useState("dashboard") // 'dashboard' or 'tracker'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        setError("") // Clear any previous errors
        try {
          await fetchBusData(user.uid)
          await fetchUserRoutes(user.uid)
        } catch (error) {
          console.error("Error during data fetching:", error)
        }
      } else {
        setUser(null)
        setBusData(null)
        setRouteData(null)
        setUserRoutes([])
        setError("No user logged in.")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const fetchBusData = async (uid) => {
    try {
      setLoading(true)
      setError("")

      // Query buses collection for current user's bus
      const busesRef = collection(db, "buses")
      const q = query(busesRef, where("driverId", "==", uid))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const busDoc = querySnapshot.docs[0]
        const busData = { id: busDoc.id, ...busDoc.data() }
        setBusData(busData)

        // If bus has a route, fetch route data
        if (busData.routeId) {
          await fetchRouteData(busData.routeId)
        }
      } else {
        setBusData(null)
        setRouteData(null)
        console.log("No bus created by this driver yet")
      }
    } catch (error) {
      console.error("Error fetching bus data:", error)
      if (error.code && error.code !== "permission-denied") {
        setError(
          "Failed to connect to database. Please check your internet connection."
        )
      } else if (error.code === "permission-denied") {
        setError(
          "Permission denied. Please check your Firestore security rules."
        )
      } else {
        console.error("Unexpected error:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRouteData = async (routeId) => {
    try {
      const routeRef = doc(db, "routes", routeId)
      const routeDoc = await getDoc(routeRef)

      if (routeDoc.exists()) {
        setRouteData({ id: routeDoc.id, ...routeDoc.data() })
      } else {
        setRouteData(null)
        console.log("Route not found:", routeId)
      }
    } catch (error) {
      console.error("Error fetching route data:", error)
      setRouteData(null)
    }
  }

  const fetchUserRoutes = async (uid) => {
    try {
      const routesRef = collection(db, "routes")
      const q = query(
        routesRef,
        where("createdBy", "==", uid),
        orderBy("createdAt", "desc")
      )

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const routes = []
          querySnapshot.forEach((doc) => {
            routes.push({ id: doc.id, ...doc.data() })
          })
          setUserRoutes(routes)
        },
        (error) => {
          console.error("Error listening to routes:", error)
          if (error.code === "failed-precondition") {
            const simpleQuery = query(routesRef, where("createdBy", "==", uid))
            onSnapshot(simpleQuery, (querySnapshot) => {
              const routes = []
              querySnapshot.forEach((doc) => {
                routes.push({ id: doc.id, ...doc.data() })
              })
              setUserRoutes(routes)
            })
          }
        }
      )

      return unsubscribe
    } catch (error) {
      console.error("Error fetching user routes:", error)
      setUserRoutes([])
    }
  }

  const createBus = async () => {
    if (
      !user ||
      !newBus.busNumber.trim() ||
      !newBus.busModel.trim() ||
      !newBus.capacity.trim()
    ) {
      alert("Please fill in all bus details")
      return
    }

    try {
      setCreatingBus(true)

      // Check if bus number already exists
      const busesRef = collection(db, "buses")
      const q = query(
        busesRef,
        where("busNumber", "==", newBus.busNumber.trim())
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        alert("Bus number already exists. Please choose a different number.")
        return
      }

      // Create bus in Firestore
      const busData = {
        busNumber: newBus.busNumber.trim(),
        busModel: newBus.busModel.trim(),
        capacity: parseInt(newBus.capacity.trim()),
        driverId: user.uid,
        driverEmail: user.email,
        createdAt: serverTimestamp(),
        currentStop: null,
        routeId: null,
        isActive: true,
      }

      const busRef = await addDoc(collection(db, "buses"), busData)

      // Update local state
      setBusData({ id: busRef.id, ...busData })

      // Reset form
      setNewBus({ busNumber: "", busModel: "", capacity: "" })
      setShowBusSetup(false)

      alert("Bus created successfully!")
    } catch (error) {
      console.error("Error creating bus:", error)
      alert("Failed to create bus")
    } finally {
      setCreatingBus(false)
    }
  }

  const markStop = async (stopName) => {
    if (!busData || !user) return

    try {
      setMarkingStop(stopName)

      // Update bus document in Firestore
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        currentStop: stopName,
        lastUpdated: serverTimestamp(),
        arrivedAt: serverTimestamp(),
      })

      // Update local state
      setBusData((prev) => ({
        ...prev,
        currentStop: stopName,
        lastUpdated: { seconds: Date.now() / 1000 },
        arrivedAt: { seconds: Date.now() / 1000 },
      }))

      // Create arrival record
      await addDoc(collection(db, "arrivals"), {
        busId: busData.id,
        routeId: busData.routeId,
        stopName: stopName,
        driverId: user.uid,
        timestamp: serverTimestamp(),
      })

      alert(`Successfully marked arrival at ${stopName}`)
    } catch (error) {
      console.error("Error updating stop:", error)
      alert("Failed to update stop")
    } finally {
      setMarkingStop(null)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      alert("Logged out successfully")
    } catch (error) {
      console.error("Error signing out:", error)
      alert("Failed to logout")
    }
  }

  const addStopField = () => {
    setNewRoute((prev) => ({
      ...prev,
      stops: [...prev.stops, ""],
    }))
  }

  const removeStopField = (index) => {
    setNewRoute((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
    }))
  }

  const updateStopField = (index, value) => {
    setNewRoute((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, i) => (i === index ? value : stop)),
    }))
  }
  const navigate = useNavigate()
  const handleLoginBtn = () => {
    // (Optional) Clear any session/localStorage data here
    // localStorage.removeItem('userToken');

    navigate("/loginDriver")
  }

  const createRoute = async () => {
    if (
      !user ||
      !newRoute.routeName.trim() ||
      newRoute.stops.some((stop) => !stop.trim())
    ) {
      alert("Please fill in all fields")
      return
    }

    try {
      setCreatingRoute(true)

      // Create route in Firestore
      const routeData = {
        routeName: newRoute.routeName.trim(),
        stops: newRoute.stops
          .filter((stop) => stop.trim())
          .map((stop) => stop.trim()),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        isActive: true,
      }

      await addDoc(collection(db, "routes"), routeData)

      // Reset form
      setNewRoute({ routeName: "", stops: [""] })
      setShowCreateRoute(false)

      alert("Route created successfully!")
    } catch (error) {
      console.error("Error creating route:", error)
      alert("Failed to create route")
    } finally {
      setCreatingRoute(false)
    }
  }

  const deleteRoute = async (routeId) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return

    try {
      // Check if route is currently being used by the bus
      if (busData && busData.routeId === routeId) {
        // Remove route from bus first
        const busRef = doc(db, "buses", busData.id)
        await updateDoc(busRef, {
          routeId: null,
          currentStop: null,
          lastUpdated: serverTimestamp(),
        })
      }

      // Delete route from Firestore
      await deleteDoc(doc(db, "routes", routeId))

      // Refresh data
      await fetchBusData(user.uid)

      alert("Route deleted successfully")
    } catch (error) {
      console.error("Error deleting route:", error)
      alert("Failed to delete route")
    }
  }

  const assignRouteToCurrentBus = async (routeId) => {
    if (!busData || !user) return

    try {
      // Update bus with new route
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        routeId: routeId,
        currentStop: null,
        lastUpdated: serverTimestamp(),
      })

      // Refresh bus and route data
      await fetchBusData(user.uid)
      alert("Route assigned to your bus successfully!")
    } catch (error) {
      console.error("Error assigning route:", error)
      alert("Failed to assign route")
    }
  }

  // Handle location updates from RouteTracker
  const handleLocationUpdate = async (location) => {
    if (!busData || !user) return

    try {
      // Update bus location in Firestore
      const busRef = doc(db, "buses", busData.id)
      await updateDoc(busRef, {
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        lastLocationUpdate: serverTimestamp(),
        isMoving: true,
      })

      // Update local state
      setBusData((prev) => ({
        ...prev,
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        lastLocationUpdate: { seconds: Date.now() / 1000 },
        isMoving: true,
      }))
    } catch (error) {
      console.error("Error updating location:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && error !== "No user logged in.") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="font-bold mb-2">Connection Error</h3>
            <p>{error}</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setError("")
                if (user) {
                  fetchBusData(user.uid)
                  fetchUserRoutes(user.uid)
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error === "No user logged in.") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            Please log in to access the driver dashboard
          </div>
          <button
            onClick={handleLoginBtn}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Render RouteTracker component if active
  if (activeView === "tracker") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Bus className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Route Tracker
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <span className="text-sm text-gray-600">
                  Welcome, {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RouteTracker Component */}
        <RouteTracker
          busData={busData}
          routeData={routeData}
          onLocationUpdate={handleLocationUpdate}
          onStopUpdate={markStop}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bus className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Driver Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Route Tracker Button - Only show if bus and route are set up */}
              {busData && routeData && (
                <button
                  onClick={() => setActiveView("tracker")}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Start Tracking
                </button>
              )}
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        {busData && routeData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  Bus {busData.busNumber} is ready for route tracking on "
                  {routeData.routeName}"
                </span>
              </div>
              <button
                onClick={() => setActiveView("tracker")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Map className="w-4 h-4 mr-2" />
                Start Tracking
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Bus & Route Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Navigation className="w-5 h-5 mr-2" />
                My Bus & Route
              </h2>
              {!busData && (
                <button
                  onClick={() => setShowBusSetup(!showBusSetup)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Setup Bus
                </button>
              )}
            </div>

            {/* Bus Setup Form */}
            {showBusSetup && !busData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">
                  Setup Your Bus
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bus Number
                    </label>
                    <input
                      type="text"
                      value={newBus.busNumber}
                      onChange={(e) =>
                        setNewBus((prev) => ({
                          ...prev,
                          busNumber: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MH-12-AB-1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bus Model
                    </label>
                    <input
                      type="text"
                      value={newBus.busModel}
                      onChange={(e) =>
                        setNewBus((prev) => ({
                          ...prev,
                          busModel: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Tata Starbus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity (seats)
                    </label>
                    <input
                      type="number"
                      value={newBus.capacity}
                      onChange={(e) =>
                        setNewBus((prev) => ({
                          ...prev,
                          capacity: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 50"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={createBus}
                      disabled={creatingBus}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                        creatingBus
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {creatingBus ? "Creating..." : "Create Bus"}
                    </button>
                    <button
                      onClick={() => setShowBusSetup(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {busData ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900">
                    Bus: {busData.busNumber}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Model: {busData.busModel}
                  </p>
                  <p className="text-sm text-blue-700">
                    Capacity: {busData.capacity} seats
                  </p>
                  <p className="text-sm text-blue-700">
                    Current Stop: {busData.currentStop || "Not set"}
                  </p>
                  {busData.lastUpdated && (
                    <p className="text-sm text-blue-700">
                      Last Updated:{" "}
                      {busData.lastUpdated.seconds
                        ? new Date(
                            busData.lastUpdated.seconds * 1000
                          ).toLocaleString()
                        : "Never"}
                    </p>
                  )}
                </div>

                {routeData ? (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Route: {routeData.routeName}
                    </h4>
                    <div className="space-y-2">
                      {routeData.stops?.map((stop, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-gray-700">{stop}</span>
                            {busData.currentStop === stop && (
                              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => markStop(stop)}
                            disabled={markingStop === stop}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              markingStop === stop
                                ? "bg-gray-400 text-white cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {markingStop === stop ? "Marking..." : "Arrived"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">
                      No route assigned to your bus
                    </p>
                    <p className="text-sm text-gray-400">
                      Create a route below and assign it to your bus
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No bus setup yet</p>
                <p className="text-sm text-gray-400">
                  Click "Setup Bus" to create your bus
                </p>
              </div>
            )}
          </div>

          {/* Route Management Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Route className="w-5 h-5 mr-2" />
                Route Management
              </h2>
              <button
                onClick={() => setShowCreateRoute(!showCreateRoute)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Route
              </button>
            </div>

            {/* Create Route Form */}
            {showCreateRoute && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">
                  Create New Route
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name
                    </label>
                    <input
                      type="text"
                      value={newRoute.routeName}
                      onChange={(e) =>
                        setNewRoute((prev) => ({
                          ...prev,
                          routeName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter route name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stops
                    </label>
                    {newRoute.stops.map((stop, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <input
                          type="text"
                          value={stop}
                          onChange={(e) =>
                            updateStopField(index, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Stop ${index + 1}`}
                        />
                        {newRoute.stops.length > 1 && (
                          <button
                            onClick={() => removeStopField(index)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addStopField}
                      className="flex items-center text-blue-600 hover:text-blue-700 text-sm mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Stop
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={createRoute}
                      disabled={creatingRoute}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                        creatingRoute
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {creatingRoute ? "Creating..." : "Create Route"}
                    </button>
                    <button
                      onClick={() => setShowCreateRoute(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of User Routes */}
            <h3 className="font-medium text-gray-900 mb-3">Your Routes</h3>
            {userRoutes.length > 0 ? (
              <ul className="space-y-4">
                {userRoutes.map((route) => (
                  <li
                    key={route.id}
                    className="bg-gray-50 rounded-lg p-4 shadow-sm flex items-start justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">
                        {route.routeName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Stops: {route.stops.join(" -> ")}
                      </p>
                      {busData && busData.routeId === route.id && (
                        <span className="mt-1 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          Currently Assigned
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-1">
                      {busData && busData.routeId !== route.id && (
                        <button
                          onClick={() => assignRouteToCurrentBus(route.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors flex items-center"
                          title="Assign to my bus"
                        >
                          <Bus className="w-4 h-4 mr-1" /> Assign
                        </button>
                      )}
                      <button
                        onClick={() => deleteRoute(route.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 transition-colors flex items-center"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Route className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No routes created yet</p>
                <p className="text-sm text-gray-400">
                  Click "Create Route" to add your first route
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
