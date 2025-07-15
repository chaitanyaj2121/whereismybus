const admin = require("firebase-admin")

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  // We'll use environment variables instead of JSON file
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "GET") {
    res.json({
      message: "Driver App API Server",
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}
