import React, { useEffect, useState } from "react"
import RouteTracker from "./RouteTracker"
import { useNavigate } from "react-router-dom"

import {
  LogOut,
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
  Menu, // Added Menu icon for mobile sidebar toggle
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
  const [activeView, setActiveView] = useState("dashboard") // 'dashboard' or 'tracker'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // State for mobile sidebar

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
                } else {
                  handleLoginBtn()
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {user ? "Retry" : "Go to Login"}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Please log in to access the driver dashboard.
          </h2>
          <button
            onClick={handleLoginBtn}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header for Sidebar Toggle */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between md:hidden">
        <div className="flex items-center">
          <Bus className="h-8 w-8 mr-2 text-blue-400" />
          <h1 className="text-2xl font-bold">Driver Panel</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-gray-800 text-white flex-col p-4 shadow-lg z-50 w-64 md:relative md:flex
                   ${isSidebarOpen ? "flex" : "hidden"}`}
      >
        <div className="hidden md:flex items-center mb-8">
          {" "}
          {/* Hide on mobile, show on desktop */}
          <Bus className="h-8 w-8 mr-2 text-blue-400" />
          <h1 className="text-2xl font-bold">Driver Panel</h1>
        </div>
        <nav className="flex-1 mt-8 md:mt-0">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  setActiveView("dashboard")
                  setIsSidebarOpen(false)
                }}
                className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                  activeView === "dashboard"
                    ? "bg-blue-700 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
              >
                <Map className="mr-3" />
                Dashboard
              </button>
            </li>
            {busData && busData.routeId && (
              <li>
                <button
                  onClick={() => {
                    setActiveView("tracker")
                    setIsSidebarOpen(false)
                  }}
                  className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                    activeView === "tracker"
                      ? "bg-blue-700 text-white"
                      : "hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <Navigation className="mr-3" />
                  Route Tracker
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => {
                  setShowCreateRoute(!showCreateRoute)
                  setShowBusSetup(false) // Close other forms when opening this one
                  setIsSidebarOpen(false)
                }}
                className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                  showCreateRoute
                    ? "bg-blue-700 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
              >
                <Route className="mr-3" />
                Create Route
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setShowBusSetup(!showBusSetup)
                  setShowCreateRoute(false) // Close other forms when opening this one
                  setIsSidebarOpen(false)
                }}
                className={`flex items-center w-full p-3 rounded-lg text-left transition-colors duration-200 ${
                  showBusSetup
                    ? "bg-blue-700 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
              >
                <Settings className="mr-3" />
                Bus Setup
              </button>
            </li>
          </ul>
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-left text-red-400 hover:bg-gray-700 transition-colors duration-200"
          >
            <LogOut className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* User Info */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-xl md:text-3xl font-semibold text-gray-800 mb-1">
              Welcome, Driver!
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              {user ? user.email : "Guest User"}
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center text-gray-700 text-sm md:text-base">
              <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              <p>{new Date().toLocaleTimeString()}</p>
            </div>
            <div className="flex items-center text-gray-700 text-sm md:text-base">
              <Activity className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              <p>Online</p>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        {activeView === "dashboard" && (
          <>
            {/* Bus Setup Section */}
            {showBusSetup && (
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-8 border border-blue-200">
                <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Bus className="mr-2 text-blue-600 h-5 w-5 md:h-6 md:w-6" />{" "}
                  Bus Setup
                  <button
                    onClick={() => setShowBusSetup(false)}
                    className="ml-auto p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </h3>
                {!busData ? (
                  <div classNameD="space-y-4">
                    <p className="text-gray-600 text-sm md:text-base mb-4">
                      You don't have a bus registered yet. Please create one.
                    </p>
                    <input
                      type="text"
                      placeholder="Bus Number (e.g., KA01AB1234)"
                      value={newBus.busNumber}
                      onChange={(e) =>
                        setNewBus({ ...newBus, busNumber: e.target.value })
                      }
                      className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                    />
                    <input
                      type="text"
                      placeholder="Bus Model (e.g., Tata Ultra)"
                      value={newBus.busModel}
                      onChange={(e) =>
                        setNewBus({ ...newBus, busModel: e.target.value })
                      }
                      className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-3"
                    />
                    <input
                      type="number"
                      placeholder="Capacity (e.g., 50)"
                      value={newBus.capacity}
                      onChange={(e) =>
                        setNewBus({ ...newBus, capacity: e.target.value })
                      }
                      className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4"
                    />
                    <button
                      onClick={createBus}
                      disabled={creatingBus}
                      className={`w-full p-3 rounded-lg text-white font-semibold flex items-center justify-center transition-colors duration-200 ${
                        creatingBus
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {creatingBus ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>{" "}
                          Creating Bus...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2" /> Create Bus
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                      Your Registered Bus:
                    </h4>
                    <p className="text-gray-600 text-sm md:text-base">
                      <span className="font-medium">Bus Number:</span>{" "}
                      {busData.busNumber}
                    </p>
                    <p className="text-gray-600 text-sm md:text-base">
                      <span className="font-medium">Bus Model:</span>{" "}
                      {busData.busModel}
                    </p>
                    <p className="text-gray-600 text-sm md:text-base mb-4">
                      <span className="font-medium">Capacity:</span>{" "}
                      {busData.capacity}
                    </p>
                    {busData.routeId ? (
                      <p className="text-gray-600 text-sm md:text-base">
                        <span className="font-medium">Assigned Route:</span>{" "}
                        {routeData ? routeData.routeName : "Loading..."}
                      </p>
                    ) : (
                      <p className="text-orange-500 font-medium text-sm md:text-base">
                        No route assigned to this bus. Assign one below!
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Create Route Section */}
            {showCreateRoute && (
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-8 border border-green-200">
                <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Route className="mr-2 text-green-600 h-5 w-5 md:h-6 md:w-6" />{" "}
                  Create New Route
                  <button
                    onClick={() => setShowCreateRoute(false)}
                    className="ml-auto p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Route Name (e.g., Downtown Express)"
                    value={newRoute.routeName}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, routeName: e.target.value })
                    }
                    className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                  <label className="block text-gray-700 font-medium text-sm md:text-base">
                    Stops:
                  </label>
                  {newRoute.stops.map((stop, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={`Stop ${index + 1}`}
                        value={stop}
                        onChange={(e) => updateStopField(index, e.target.value)}
                        className="flex-1 p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                      />
                      {newRoute.stops.length > 1 && (
                        <button
                          onClick={() => removeStopField(index)}
                          className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addStopField}
                    className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm md:text-base"
                  >
                    <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Add Stop
                  </button>
                  <button
                    onClick={createRoute}
                    disabled={creatingRoute}
                    className={`w-full p-3 rounded-lg text-white font-semibold flex items-center justify-center transition-colors duration-200 ${
                      creatingRoute
                        ? "bg-green-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {creatingRoute ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>{" "}
                        Creating Route...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2" /> Save Route
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Your Created Routes */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
              <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <Route className="mr-2 text-purple-600 h-5 w-5 md:h-6 md:w-6" />{" "}
                Your Created Routes
              </h3>
              {userRoutes.length > 0 ? (
                <ul className="space-y-4">
                  {userRoutes.map((route) => (
                    <li
                      key={route.id}
                      className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center"
                    >
                      <div>
                        <p className="text-base md:text-lg font-semibold text-gray-800">
                          {route.routeName}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600 mb-2">
                          Stops: {route.stops.join(" - ")}
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-3 md:mt-0 w-full md:w-auto">
                        <button
                          onClick={() => assignRouteToCurrentBus(route.id)}
                          disabled={busData && busData.routeId === route.id}
                          className={`w-full md:w-auto px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-200 ${
                            busData && busData.routeId === route.id
                              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          }`}
                        >
                          {busData && busData.routeId === route.id
                            ? "Assigned"
                            : "Assign to Bus"}
                        </button>
                        <button
                          onClick={() => deleteRoute(route.id)}
                          className="w-full md:w-auto px-4 py-2 rounded-lg font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="inline-block mr-1 h-4 w-4" />{" "}
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm md:text-base">
                  You haven't created any routes yet. Create one above!
                </p>
              )}
            </div>
          </>
        )}

        {activeView === "tracker" && busData && busData.routeId && (
          <RouteTracker
            busData={busData}
            routeData={routeData}
            onRouteUpdate={handleLocationUpdate}
          />
        )}
      </main>
    </div>
  )
}

export default DriverDashboard
