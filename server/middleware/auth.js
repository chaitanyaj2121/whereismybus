const admin = require("firebase-admin")

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "No token provided" })
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" })
  }
}

module.exports = verifyToken
