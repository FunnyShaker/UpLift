const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/** Reads "Authorization: Bearer <token>" and returns the payload, or null. */
const readToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
  if (!token) return null;

  return jwt.verify(token, JWT_SECRET);
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    req.user = jwt.verify(token, JWT_SECRET); // Add user info to request
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Attaches req.user when a valid token is present, but never blocks the
 * request. Used by public routes that still want to know who is calling,
 * such as recording who ran a flight search.
 */
const optionalAuth = (req, res, next) => {
  try {
    req.user = readToken(req);
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { verifyToken, optionalAuth, JWT_SECRET };
