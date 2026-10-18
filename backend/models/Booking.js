const {
  listRecords,
  createRecord,
  deleteRecord,
  linkRecord,
  whereEquals,
} = require("../db/nocodb");

/**
 * Bookings table (NocoDB).
 *
 * "booking ID" is AutoNumber, so it is left to NocoDB. "user" and "flight" are
 * Links columns: the row is created first and linked afterwards, the same way
 * Search Details does it. Payments link to a booking from the Payments side.
 */
const FIELDS = {
  bookingId: "booking ID",
  fullName: "full name",
  user: "user",
  flight: "flight",
};

/** Link field ids, from the Bookings table's API Snippet (see .env.example). */
const LINKS = {
  user: "NOCODB_BOOKINGS_USER_LINK_ID",
  flight: "NOCODB_BOOKINGS_FLIGHT_LINK_ID",
};

/** How many bookings to pull for one user. */
const USER_LOOKUP_LIMIT = 100;

/**
 * NocoDB expands a Links column as the linked record, or as an array of them
 * when the column is set up as many-to-many.
 */
function linkedId(value) {
  const linked = Array.isArray(value) ? value[0] : value;
  return linked?.Id ?? null;
}

function toBooking(record) {
  return {
    id: record.Id,
    bookingId: record[FIELDS.bookingId] ?? record.Id,
    fullName: record[FIELDS.fullName] || "",
    userId: linkedId(record[FIELDS.user]),
    flightRecordId: linkedId(record[FIELDS.flight]),
    createdAt: record.CreatedAt,
  };
}

function linkFieldId(name) {
  const envName = LINKS[name];
  const id = process.env[envName];
  if (!id) throw new Error(`${envName} is not set in .env`);
  return id;
}

/**
 * Creates a booking for one passenger on one flight and links it to the user
 * and the flight. If linking fails the half-made row is removed, so a booking
 * never exists without its owner.
 */
async function create({ userId, flightRecordId, fullName }) {
  const userLink = linkFieldId("user");
  const flightLink = linkFieldId("flight");

  const created = await createRecord("bookings", { [FIELDS.fullName]: fullName });

  try {
    await linkRecord("bookings", userLink, created.Id, userId);
    await linkRecord("bookings", flightLink, created.Id, flightRecordId);
  } catch (err) {
    await remove(created.Id).catch(() => {});
    throw err;
  }

  return {
    id: created.Id,
    bookingId: created[FIELDS.bookingId] ?? created.Id,
    fullName,
    userId,
    flightRecordId,
  };
}

async function remove(id) {
  return deleteRecord("bookings", id);
}

/**
 * All bookings of one user, newest first.
 *
 * Like Search Details, NocoDB only filters a Links column by the linked
 * record's display value (the email on Users), so the query goes by email
 * and the linked user id is confirmed afterwards.
 */
async function findForUser({ userId, email }) {
  if (!email) return [];

  const records = await listRecords("bookings", {
    where: whereEquals([[FIELDS.user, email]]),
    sort: "-CreatedAt",
    limit: USER_LOOKUP_LIMIT,
  });

  return records
    .map(toBooking)
    .filter((booking) => !userId || booking.userId === userId);
}

module.exports = { FIELDS, LINKS, create, remove, findForUser, toBooking };
