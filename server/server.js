const express = require("express")
const cors = require("cors")
const admin = require("firebase-admin")
require("dotenv").config()
const path = require("path")

const serviceAccount = require(path.resolve(
  __dirname,
  "./whereismybus-26f34-firebase-adminsdk-fbsvc-57661c7384.json"
))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
const PORT = process.env.PORT || 5000

// CORS config - allow Vite dev server on localhost:5173
app.use(
  cors({
    origin: ["http://localhost:5173"], // or set to "*" for all origins (not recommended in prod)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
)

app.use(express.json())

// Routes
app.use("/api/drivers", require("./routes/drivers"))

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Driver App API Server" })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
