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
  const flightId = trimmed(req.body.flightId);
  const fullName = trimmed(req.body.fullName);

  const payment = req.body.payment || {};
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
    const user = await User.findByEmail(req.user.email);
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
    const bookings = await Booking.findForUser({
      userId: req.user.userId,
      email: req.user.email,
    });

    // One lookup per distinct flight, one at a time to stay under the rate limit
    const flights = new Map();
    for (const booking of bookings) {
      const id = booking.flightRecordId;
      if (id && !flights.has(id)) {
        flights.set(id, await Flight.findById(id).catch(() => null));
      }
    }

    const result = bookings.map((booking) => ({
      bookingId: booking.bookingId,
      fullName: booking.fullName,
      createdAt: booking.createdAt,
      flight: flights.get(booking.flightRecordId) || null,
    }));

    res.json({
      message: "Bookings retrieved successfully",
      count: result.length,
      bookings: result,
    });
  } catch (err) {
    console.error("Error in GET /api/bookings:", err);
    res.status(500).json({ message: "Error retrieving bookings", error: err.message });
  }
});

module.exports = router;
