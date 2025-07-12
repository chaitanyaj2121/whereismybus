import React, { useState, useEffect } from "react"
import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// DriverLogin component
const DriverLogin = () => {
  // State variables for Firebase and user authentication
  const [firebaseApp, setFirebaseApp] = useState(null)
  const [auth, setAuth] = useState(null)
  const [db, setDb] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)

  // State for login form
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false) // State to manage redirection

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    try {
      // Access global variables for Firebase configuration
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id"
      const firebaseConfig =
        typeof __firebase_config !== "undefined"
          ? JSON.parse(__firebase_config)
          : {}
      const initialAuthToken =
        typeof __initial_auth_token !== "undefined"
          ? __initial_auth_token
          : null

      // Initialize Firebase app
      const app = initializeApp(firebaseConfig)
      setFirebaseApp(app)

      // Get Auth and Firestore instances
      const authInstance = getAuth(app)
      setAuth(authInstance)
      setDb(getFirestore(app))

      // Set up authentication state observer
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          // User is signed in.
          setUserId(user.uid)
          setIsAuthReady(true)
          console.log("User is signed in:", user.uid)
        } else {
          // User is signed out. Attempt anonymous sign-in if no initial token
          setUserId(null)
          setIsAuthReady(true) // Still ready, just no user
          console.log(
            "No user signed in. Attempting anonymous sign-in or using initial token."
          )
          if (initialAuthToken) {
            try {
              await signInWithCustomToken(authInstance, initialAuthToken)
              console.log("Signed in with custom token.")
            } catch (tokenError) {
              console.error("Error signing in with custom token:", tokenError)
              await signInAnonymously(authInstance)
              console.log("Signed in anonymously due to token error.")
            }
          } else {
            await signInAnonymously(authInstance)
            console.log("Signed in anonymously.")
          }
        }
      })

      // Cleanup subscription on unmount
      return () => unsubscribe()
    } catch (e) {
      console.error("Error initializing Firebase:", e)
      setError(
        "Failed to initialize application. Please check console for details."
      )
    }
  }, []) // Empty dependency array ensures this runs only once on mount

  // Handle user login
  const handleLogin = async (e) => {
    e.preventDefault() // Prevent default form submission
    setError("") // Clear previous errors

    if (!auth) {
      setError("Firebase Auth not initialized.")
      return
    }

    try {
      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email, password)
      setIsLoggedIn(true) // Set state to true for redirection
      console.log("Login successful!")
    } catch (error) {
      // Handle authentication errors
      let errorMessage = "An unexpected error occurred."
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "Invalid email address format."
          break
        case "auth/user-disabled":
          errorMessage = "This user account has been disabled."
          break
        case "auth/user-not-found":
        case "auth/wrong-password":
          errorMessage = "Invalid email or password."
          break
        case "auth/too-many-requests":
          errorMessage = "Too many login attempts. Please try again later."
          break
        default:
          errorMessage = `Login failed: ${error.message}`
          break
      }
      setError(errorMessage)
      console.error("Login error:", error)
    }
  }

  // Simulate redirection to dashboard
  if (isLoggedIn) {
    // In a real React Router setup, you would use:
    // const navigate = useNavigate();
    // navigate('/driver-dashboard');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <h2 className="text-3xl font-bold text-green-600 mb-4">
            Welcome, Driver!
          </h2>
          <p className="text-gray-700 mb-6">You have successfully logged in.</p>
          <p className="text-gray-500 text-sm">
            (In a full application, you would be redirected to the
            /driver-dashboard)
          </p>
          <button
            onClick={() => {
              setIsLoggedIn(false) // Go back to login form for demo purposes
              signOut(auth) // Sign out for demo
            }}
            className="mt-6 w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
          >
            Go Back / Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Render the login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Driver Login
        </h2>

        {/* Display current user ID for debugging/info */}
        {isAuthReady && userId && (
          <p className="text-sm text-gray-600 mb-4 text-center break-all">
            Current User ID:{" "}
            <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
          </p>
        )}
        {!isAuthReady && (
          <p className="text-sm text-gray-500 mb-4 text-center">
            Initializing Firebase...
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
              disabled={!isAuthReady} // Disable button until Firebase is ready
            >
              {isAuthReady ? "Log In" : "Loading..."}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DriverLogin
