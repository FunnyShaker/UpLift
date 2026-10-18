const { createRecord, deleteRecord, linkRecord } = require("../db/nocodb");

/**
 * Payments table (NocoDB).
 *
 * Only what is needed to show the payment back to the user is stored: the
 * cardholder name, the expiry, and the card number masked down to its last
 * four digits. The full card number and the CVV never reach the database.
 */
const FIELDS = {
  paymentId: "payment ID",
  cardholderName: "card holder name",
  cardNumber: "card number",
  expiryDate: "expiry date",
  user: "user",
  booking: "booking",
};

/** Link field ids, from the Payments table's API Snippet (see .env.example). */
const LINKS = {
  user: "NOCODB_PAYMENTS_USER_LINK_ID",
  booking: "NOCODB_PAYMENTS_BOOKING_LINK_ID",
};

/** "4111111111111111" -> "**** **** **** 1111" */
function maskCardNumber(cardNumber) {
  return `**** **** **** ${String(cardNumber).slice(-4)}`;
}

function linkFieldId(name) {
  const envName = LINKS[name];
  const id = process.env[envName];
  if (!id) throw new Error(`${envName} is not set in .env`);
  return id;
}

/** Records a payment for a booking and links it to the user and the booking. */
async function create({ userId, bookingId, cardholderName, cardNumber, expiryDate }) {
  const userLink = linkFieldId("user");
  const bookingLink = linkFieldId("booking");

  const maskedNumber = maskCardNumber(cardNumber);

  const created = await createRecord("payments", {
    [FIELDS.cardholderName]: cardholderName,
    [FIELDS.cardNumber]: maskedNumber,
    [FIELDS.expiryDate]: expiryDate,
  });

  try {
    await linkRecord("payments", userLink, created.Id, userId);
    await linkRecord("payments", bookingLink, created.Id, bookingId);
  } catch (err) {
    await deleteRecord("payments", created.Id).catch(() => {});
    throw err;
  }

  return {
    id: created.Id,
    paymentId: created[FIELDS.paymentId] ?? created.Id,
    cardholderName,
    cardNumber: maskedNumber,
    expiryDate,
  };
}

module.exports = { FIELDS, LINKS, create, maskCardNumber };
