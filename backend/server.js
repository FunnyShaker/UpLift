require('dotenv').config();
const express = require('express')
const cors = require('cors')
const PORT = process.env.PORT || 3000
const authRoutes = require('./routes/auth')
const flightsRoutes = require('./routes/flights')
const profileRoutes = require('./routes/profile')
const searchesRoutes = require('./routes/searches')
const User = require('./models/User')
const { verifyToken } = require('./middleware/auth')
const { ping } = require('./db/nocodb')
const app = express()

// A browser's Origin header never has a trailing slash, so a FRONTEND_URL like
// "https://site.vercel.app/" would match nothing and every request would be
// blocked by CORS. Strip it here rather than relying on whoever sets the env var.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/+$/, ''))
  : ['http://localhost:3000']

console.log('CORS allowed origins:', allowedOrigins)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Setup routes
app.use('/api/flights', flightsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/searches', searchesRoutes);
app.use('/api', authRoutes);

// Health check - confirms the backend can talk to NocoDB
app.get('/api/health', async (req, res) => {
  try {
    await ping()
    res.json({ status: 'ok', database: 'nocodb' })
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'nocodb', error: err.message })
  }
})

// Protected route - requires valid JWT token
app.get('/api/home', verifyToken, async (req, res) => {
    try {
      const user = await User.findByEmail(req.user.email)
      if (!user) {
        return res.status(404).json({message : 'User not found'})
      }
      res.json({
        message : 'Welcome back',
        user: {
          fullName: user.fullName,
          email: user.email,
          userType: user.userType
        }
      })
    } catch (err) {
      console.error("Error in /api/home:", err)
      res.status(500).json({message : 'Server error', error: err.message})
    }
})

// Start the server, then confirm the NocoDB connection
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)

  try {
    await ping()
    console.log('NocoDB connected')
  } catch (err) {
    console.error('NocoDB connection failed:', err.message)
    console.error('Check NOCODB_URL, NOCODB_TOKEN and the NOCODB_TABLE_* ids in .env')
  }
})

module.exports = app
