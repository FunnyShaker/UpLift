const express = require("express");
const Flight = require("../models/Flight");
const Search = require("../models/Search");
const { optionalAuth } = require("../middleware/auth");
const router = express.Router();

// GET all flights with optional filters
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { from, to, date } = req.query;
    // Sent as a query string, so it arrives as "true"/"false"
    const roundTrip = req.query.roundTrip === "true";
    const returnDate = roundTrip ? req.query.returnDate : undefined;

    // "YYYY-MM-DD" strings compare correctly as text
    if (date && returnDate && returnDate < date) {
      return res.status(400).json({ message: "Return date must be on or after the departure date" });
    }

    const flights = await Flight.find({ from, to, date });
    const returnFlights = roundTrip ? await Flight.findReturn({ from, to, returnDate }) : [];

    // Record the search in the Search Details table. Best effort: a logging
    // problem must never break the flight list.
    if (from || to || date) {
      try {
        await Search.log({ from, to, date, roundTrip, returnDate, userId: req.user?.userId });
      } catch (err) {
        console.error("Could not record search:", err.message);
      }
    }

    res.json({
      message: "Flights retrieved successfully",
      count: flights.length,
      flights: flights,
      returnFlights: returnFlights,
    });
  } catch (err) {
    console.error("Error in GET /api/flights:", err);
    res.status(500).json({
      message: "Error retrieving flights",
      error: err.message,
    });
  }
});

// GET a specific flight by ID
router.get("/:flightId", async (req, res) => {
  try {
    const flight = await Flight.findByFlightId(req.params.flightId);

    if (!flight) {
      return res.status(404).json({ message: "Flight not found" });
    }

    res.json({
      message: "Flight retrieved successfully",
      flight: flight,
    });
  } catch (err) {
    console.error("Error in GET /api/flights/:flightId:", err);
    res.status(500).json({
      message: "Error retrieving flight",
      error: err.message,
    });
  }
});

module.exports = router;
