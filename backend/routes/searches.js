const express = require("express");
const Flight = require("../models/Flight");
const Search = require("../models/Search");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

/**
 * The user's last search plus the flights it matches, so the app can open on
 * where they left off instead of on the full flight list.
 *
 * The flights are looked up here rather than sending the client on to
 * GET /api/flights, which would record the replayed search as a new one and
 * leave every user's history pointing at whatever they searched first.
 */
router.get("/latest", verifyToken, async (req, res) => {
  try {
    const search = await Search.findLatestForUser({
      userId: req.user.userId,
      email: req.user.email,
    });

    if (!search) {
      return res.json({
        message: "No previous search",
        search: null,
        count: 0,
        flights: [],
      });
    }

    const flights = await Flight.find({
      from: search.from,
      to: search.to,
      date: search.date,
    });

    res.json({
      message: "Latest search retrieved successfully",
      search: {
        from: search.from,
        to: search.to,
        date: search.date,
        createdAt: search.createdAt,
      },
      count: flights.length,
      flights: flights,
    });
  } catch (err) {
    console.error("Error in GET /api/searches/latest:", err);
    res.status(500).json({
      message: "Error retrieving latest search",
      error: err.message,
    });
  }
});

module.exports = router;
