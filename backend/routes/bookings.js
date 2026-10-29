const express = require("express");
const User = require("../models/User");
const Flight = require("../models/Flight");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

/** Same rules the booking form uses. */
const CARD_NUMBER_PATTERN = /^\d{16}$/;
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_PATTERN = /^\d{3,4}$/;

const trimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

/** "MM/YY" is valid through the last day of that month. */
function isExpired(expiryDate, now = new Date()) {
  const [month, year] = expiryDate.split("/").map(Number);
  const endOfMonth = new Date(2000 + year, month, 1);
  return endOfMonth <= now;
}

/** Returns an error message, or null when the payment details are usable. */
function validatePayment({ cardholderName, cardNumber, expiryDate, cvv }) {
  if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
    return "Please complete all payment fields.";
  }
  if (!CARD_NUMBER_PATTERN.test(cardNumber)) {
    return "Please enter a valid 16-digit card number.";
  }
  if (!EXPIRY_PATTERN.test(expiryDate)) {
    return "Please enter a valid expiry date in MM/YY format.";
  }
  if (isExpired(expiryDate)) {
    return "This card has expired.";
  }
  if (!CVV_PATTERN.test(cvv)) {
    return "Please enter a valid CVV.";
  }
  return null;
}

// CREATE a booking and its payment for the logged-in user
router.post("/", verifyToken, async (req, res) => {
  const body = req.body || {};
  const flightId = typeof body.flightId === "string" ? body.flightId.trim() : "";
  const inputPassengers = body.passengers === undefined ? [{ fullName: body.fullName }] : body.passengers;
  if (!Array.isArray(inputPassengers) || inputPassengers.length < 1 || inputPassengers.length > 50 ||
      inputPassengers.some((p) => !p || typeof p.fullName !== "string" || !p.fullName.trim() || p.fullName.trim().length > 200)) {
    return res.status(400).json({ message: "Provide 1 to 50 passengers, each with a fullName of 1 to 200 characters." });
  }
  const passengers = inputPassengers.map((p) => ({ fullName: p.fullName.trim() }));
  const fullName = passengers[0].fullName;

  const payment = body.payment || {};
  const cardholderName = trimmed(payment.cardholderName);
  const cardNumber = trimmed(payment.cardNumber).replace(/\s/g, "");
  const expiryDate = trimmed(payment.expiryDate);
  const cvv = trimmed(payment.cvv);

  if (!flightId) {
    return res.status(400).json({ message: "Please select a flight to book." });
  }
  if (!fullName) {
    return res.status(400).json({ message: "Please enter the passenger's full name." });
  }

  const paymentError = validatePayment({ cardholderName, cardNumber, expiryDate, cvv });
  if (paymentError) {
    return res.status(400).json({ message: paymentError });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const flight = await Flight.findByFlightId(flightId);
    if (!flight) {
      return res.status(404).json({ message: "Flight not found or no longer available." });
    }

    const booking = await Booking.create({
      userId: user.id,
      flightRecordId: flight.id,
      fullName,
      passengers,
    });

    // A booking without its payment is not a booking - undo it if the payment
    // cannot be recorded.
    let savedPayment;
    try {
      savedPayment = await Payment.create({
        userId: user.id,
        bookingId: booking.id,
        cardholderName,
        cardNumber,
        expiryDate,
      });
    } catch (err) {
      await Booking.remove(booking.id).catch(() => {});
      throw err;
    }

    res.status(201).json({
      message: "Booking confirmed successfully!",
      booking: {
        bookingId: booking.bookingId,
        fullName: booking.fullName,
        passengers: booking.passengers,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        flight: flight,
        payment: {
          paymentId: savedPayment.paymentId,
          cardholderName: savedPayment.cardholderName,
          cardNumber: savedPayment.cardNumber,
          expiryDate: savedPayment.expiryDate,
        },
      },
    });
  } catch (err) {
    console.error("Error in POST /api/bookings:", err);
    res.status(500).json({ message: "Unable to complete the booking", error: err.message });
  }
});

// GET the logged-in user's bookings, each with its flight
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.query.status !== undefined && !["Active", "Cancelled"].includes(req.query.status)) {
      return res.status(400).json({ message: "status must be Active or Cancelled." });
    }
    const bookings = await Booking.findForUser({
      userId: req.user.userId,
      email: req.user.email,
    });

    // One lookup per distinct flight, one at a time to stay under the rate limit
    const flights = new Map();
    for (const booking of bookings) {
      const id = booking.flightRecordId;
      if (id && !flights.has(id)) {
        flights.set(id, await Flight.findById(id).catch((err) => {
          if (err.status === 404) return null;
          throw err;
        }));
      }
    }

    const result = bookings.filter((booking) => !req.query.status || booking.status === req.query.status).map((booking) => ({
      bookingId: booking.bookingId,
      fullName: booking.fullName,
      createdAt: booking.createdAt,
      passengers: booking.passengers,
      status: booking.status,
      cancelledAt: booking.cancelledAt,
      flight: flights.get(booking.flightRecordId) || null,
    }));

    res.json({
      message: "Bookings retrieved successfully",
      count: result.length,
      bookings: result,
    });
  } catch (err) {
    console.error("Error in GET /api/bookings:", err);
    if (err.status === 429) {
      return res.status(503).json({ message: "The database is busy. Please wait a moment and reload your bookings." });
    }
    res.status(500).json({ message: "Error retrieving bookings", error: err.message });
  }
});

// Keep historical reservations and their payment/user/flight links intact.
async function cancelBooking(req, res) {
  if (!/^[1-9]\d*$/.test(req.params.bookingId)) {
    return res.status(400).json({ message: "A positive integer booking ID is required." });
  }
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ message: "User no longer exists." });
    const booking = await Booking.findByBookingId(req.params.bookingId);
    // Do not disclose another user's reservation.
    if (!booking || booking.userId == null || String(booking.userId) !== String(user.id)) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.status !== "Active") {
      return res.status(409).json({ message: "Only active bookings can be cancelled." });
    }
    const flight = await Flight.findById(booking.flightRecordId);
    if (!flight) {
      return res.status(409).json({ message: "The booking's linked flight could not be found." });
    }
    // Dates in this project have no airport timezone; use UTC consistently.
    const departure = Date.parse(`${flight.departureDate}T${flight.departureTime}:00Z`);
    if (!Number.isFinite(departure)) {
      return res.status(409).json({ message: "The flight has an invalid departure date or time." });
    }
    if (departure <= Date.now()) {
      return res.status(409).json({ message: "This flight has already departed, so the booking cannot be cancelled." });
    }
    const cancelled = await Booking.cancel(booking);
    return res.json({ message: "Booking cancelled successfully.", booking: {
      bookingId: cancelled.bookingId, status: cancelled.status, cancelledAt: cancelled.cancelledAt,
    } });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    if (err.status === 429) {
      return res.status(503).json({ message: "The database is busy. Please wait a moment and try cancelling again." });
    }
    return res.status(500).json({ message: "Unable to cancel the booking." });
  }
}

router.post("/:bookingId/cancel", verifyToken, cancelBooking);
router.patch("/:bookingId/cancel", verifyToken, cancelBooking);

module.exports = router;
