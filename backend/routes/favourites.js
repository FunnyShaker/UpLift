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
 * NocoDB's free tier rate-limits the API token, and the heart button gets
 * clicked quickly, so each request makes as few calls as it can: the user
 * comes from the token, all active flights are read once, and the list sent
 * back is worked out from what was already read instead of read again.
 */

/** NocoDB record id of the logged-in user. */
async function currentUser(req) {
  const tokenId = Number(req.user.userId);
  if (tokenId) return { id: tokenId, email: req.user.email };

  // Tokens always carry userId today; this only covers anything older
  const user = await User.findByEmail(req.user.email);
  return user ? { id: user.id, email: user.email } : null;
}

/** The active flights covered by any of the favourites. */
function favouriteFlights(flights, favourites) {
  return flights.filter((flight) =>
    favourites.some((favourite) => Favourite.covers(favourite, flight)),
  );
}

/** NocoDB's rate limit is worth its own message: waiting a moment fixes it. */
function sendError(res, err, message) {
  if (err.status === 429) {
    return res.status(503).json({
      message: "The database is busy right now. Please try again in a few seconds.",
    });
  }
  res.status(500).json({ message, error: err.message });
}

function sendFavourites(res, flights, favourites, message, status = 200) {
  const list = favouriteFlights(flights, favourites);
  res.status(status).json({ message, count: list.length, flights: list });
}

/** Loads everything a favourites request needs, in two NocoDB calls. */
async function load(req) {
  const user = await currentUser(req);
  if (!user) return { user: null };

  const favourites = await Favourite.findForUser({ userId: user.id, email: user.email });
  const flights = await Flight.find();

  return { user, favourites, flights };
}

// GET the logged-in user's favourite flights
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favourites = await Favourite.findForUser({ userId: user.id, email: user.email });
    const flights = favourites.length > 0 ? await Flight.find() : [];

    sendFavourites(res, flights, favourites, "Favourites retrieved successfully");
  } catch (err) {
    console.error("Error in GET /api/favourites:", err);
    sendError(res, err, "Error retrieving favourites");
  }
});

// SAVE a flight as a favourite
router.post("/", verifyToken, async (req, res) => {
  const flightId = req.body.flightId ? String(req.body.flightId).trim() : "";
  if (!flightId) {
    return res.status(400).json({ message: "flightId is required" });
  }

  try {
    const { user, favourites, flights } = await load(req);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const flight = flights.find((item) => item.flightId === flightId);
    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    if (favourites.some((favourite) => Favourite.covers(favourite, flight))) {
      return sendFavourites(res, flights, favourites, "Flight is already a favourite");
    }

    const created = await Favourite.create({ userId: user.id, flight });

    sendFavourites(res, flights, [...favourites, created], "Flight saved as a favourite", 201);
  } catch (err) {
    console.error("Error in POST /api/favourites:", err);
    sendError(res, err, "Error saving favourite");
  }
});

// REMOVE a flight from the favourites
router.delete("/:flightId", verifyToken, async (req, res) => {
  try {
    const { user, favourites, flights } = await load(req);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const flight = flights.find((item) => item.flightId === req.params.flightId);
    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    const kept = [];
    for (const favourite of favourites) {
      if (Favourite.covers(favourite, flight)) {
        await Favourite.remove(favourite.id);
      } else {
        kept.push(favourite);
      }
    }

    sendFavourites(res, flights, kept, "Flight removed from favourites");
  } catch (err) {
    console.error("Error in DELETE /api/favourites/:flightId:", err);
    sendError(res, err, "Error removing favourite");
  }
});

module.exports = router;
