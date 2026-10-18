const express = require("express");
const User = require("../models/User");
const Flight = require("../models/Flight");
const Favourite = require("../models/Favourite");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

/**
 * Favourite flights of the logged-in user. Every endpoint answers with the
 * user's full favourites list, so the client can redraw from one response.
 *
 * See models/Favourite.js: until the table has a "flight" link, a favourite is
 * a route, and every active flight on that route counts as favourited.
 */

/** The active flights covered by any of the user's favourites. */
async function favouriteFlights(favourites) {
  if (favourites.length === 0) return [];

  const flights = await Flight.find();
  return flights.filter((flight) =>
    favourites.some((favourite) => Favourite.covers(favourite, flight)),
  );
}

async function sendFavourites(res, user, message, status = 200) {
  const favourites = await Favourite.findForUser({ userId: user.id, email: user.email });
  const flights = await favouriteFlights(favourites);

  res.status(status).json({ message, count: flights.length, flights });
}

// GET the logged-in user's favourite flights
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendFavourites(res, user, "Favourites retrieved successfully");
  } catch (err) {
    console.error("Error in GET /api/favourites:", err);
    res.status(500).json({ message: "Error retrieving favourites", error: err.message });
  }
});

// SAVE a flight as a favourite
router.post("/", verifyToken, async (req, res) => {
  const flightId = req.body.flightId ? String(req.body.flightId).trim() : "";
  if (!flightId) {
    return res.status(400).json({ message: "flightId is required" });
  }

  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const flight = await Flight.findByFlightId(flightId);
    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    const favourites = await Favourite.findForUser({ userId: user.id, email: user.email });
    if (favourites.some((favourite) => Favourite.covers(favourite, flight))) {
      return sendFavourites(res, user, "Flight is already a favourite");
    }

    await Favourite.create({ userId: user.id, flight });

    await sendFavourites(res, user, "Flight saved as a favourite", 201);
  } catch (err) {
    console.error("Error in POST /api/favourites:", err);
    res.status(500).json({ message: "Error saving favourite", error: err.message });
  }
});

// REMOVE a flight from the favourites
router.delete("/:flightId", verifyToken, async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const flight = await Flight.findByFlightId(req.params.flightId);
    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    const favourites = await Favourite.findForUser({ userId: user.id, email: user.email });
    for (const favourite of favourites) {
      if (Favourite.covers(favourite, flight)) {
        await Favourite.remove(favourite.id);
      }
    }

    await sendFavourites(res, user, "Flight removed from favourites");
  } catch (err) {
    console.error("Error in DELETE /api/favourites/:flightId:", err);
    res.status(500).json({ message: "Error removing favourite", error: err.message });
  }
});

module.exports = router;
