import React from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import DriverLogin from "./components/DriverLogin"
import DriverDashboard from "./components/DriverDashboard"
import "./index.css"
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<DriverLogin />} />
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/logindriver" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
