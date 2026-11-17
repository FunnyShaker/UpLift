const express = require("express");
const Booking = require("../models/Booking");
const { verifyToken } = require("../middleware/auth");
const router = express.Router();

/**
 * Loyalty points are not a table of their own: each booking stores the
 * "points earned" when it was made. The balance is the sum over the user's
 * Active bookings, so a cancelled booking's points simply stop counting while
 * the value itself stays on the booking for the history.
 */
function summarize(bookings) {
  // Bookings made before loyalty points existed earned nothing; leave them out.
  const history = bookings.filter((booking) => booking.pointsEarned > 0).map((booking) => {
    const removed = booking.status === "Cancelled";
    return {
      bookingId: booking.bookingId,
      date: booking.createdAt,
      points: booking.pointsEarned,
      status: removed ? "Removed" : "Earned",
      bookingStatus: booking.status,
      cancelledAt: booking.cancelledAt,
    };
  });

  const total = history
    .filter((entry) => entry.status === "Earned")
    .reduce((sum, entry) => sum + entry.points, 0);

  return { balance: Math.max(0, total), history };
}

// GET the logged-in user's points balance and history (newest first)
router.get("/", verifyToken, async (req, res) => {
  try {
    // findForUser only returns bookings linked to the token's user.
    const bookings = await Booking.findForUser({
      userId: req.user.userId,
      email: req.user.email,
    });

    const { balance, history } = summarize(bookings);

    res.json({
      message: "Loyalty points retrieved successfully",
      balance,
      history,
    });
  } catch (err) {
    console.error("Error in GET /api/loyalty:", err);
    if (err.status === 429) {
      return res.status(503).json({ message: "The database is busy. Please wait a moment and reload your points." });
    }
    res.status(500).json({ message: "Unable to load your loyalty points." });
  }
});

module.exports = router;
module.exports.summarize = summarize;
