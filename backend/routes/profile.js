const express = require("express");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

/**
 * Profile endpoints for the "country" and "phone number" columns added in the
 * NocoDB Users table. Response shape matches what the profile page expects:
 * { fullName, email, phone, country, userType }.
 */

// GET the logged-in user's profile
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(User.toPublicUser(user));
  } catch (err) {
    console.error("Error in GET /api/profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/** Same rule the profile form uses: digits, spaces and + - ( ), 7-20 chars. */
const PHONE_PATTERN = /^[0-9+\-() ]{7,20}$/;

const trimmed = (value) => (value === undefined ? undefined : String(value).trim());

// UPDATE the logged-in user's profile
router.put("/", verifyToken, async (req, res) => {
  const fullName = trimmed(req.body.fullName);
  const country = trimmed(req.body.country);
  const phone = trimmed(req.body.phone);

  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName !== undefined && !fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ message: "Please enter a valid phone number" });
    }

    if (country && country.length > 60) {
      return res.status(400).json({ message: "Country name is too long" });
    }

    const updated = await User.updateById(user.id, { fullName, country, phone });

    res.json(User.toPublicUser(updated || user));
  } catch (err) {
    console.error("Error in PUT /api/profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
