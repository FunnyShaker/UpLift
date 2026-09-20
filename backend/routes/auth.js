const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/auth");
const router = express.Router();

const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

// SIGNUP
router.post("/signup", async (req, res) => {
  const { email, password, fullName, userType } = req.body;

  try {
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "email already taken" });
    }

    const user = await User.create({ email, password, fullName, userType });

    res.status(201).json({
      message: "Signup successful",
      user: { fullName, email, userType },
      token: signToken(user),
    });
  } catch (err) {
    console.error("Error in /api/signup:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    if (user.password === password) {
      return res.json({
        message: "Login successful",
        user: { fullName: user.fullName, email: user.email, userType: user.userType },
        token: signToken(user),
      });
    } else {
      return res.status(400).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Error in /api/login:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// LOGOUT (client just deletes token, but we can have this endpoint)
router.post('/logout' , (req , res) => {
    res.json({message : 'logout successful'})
})

module.exports = router
