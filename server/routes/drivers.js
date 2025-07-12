const express = require("express")
const router = express.Router()
const verifyToken = require("../middleware/auth")

// Get driver profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user
    // Fetch driver data from Firestore or your database
    res.json({
      uid,
      message: "Driver profile data",
      // Add your driver data here
    })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

// Update driver location
router.post("/location", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user
    const { latitude, longitude } = req.body

    // Update driver location in database
    res.json({
      message: "Location updated successfully",
      location: { latitude, longitude },
    })
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
