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
import HomePage from "./components/HomePage"
import SearchResultsPage from "./components/SearchResultPage"
import BusDetailsPage from "./components/BusDetailsPage"
import MainHomePage from "./components/MainHomePage"
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<DriverLogin />} />
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/logindriver" element={<Navigate to="/login" />} />
          <Route path="/search" element={<HomePage />} />
          <Route path="/busDetails/:sessionId" element={<BusDetailsPage />} />
          <Route path="/searchResults" element={<SearchResultsPage />} />
          <Route path="/" element={<MainHomePage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
