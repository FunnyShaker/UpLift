const {
  listRecords,
  findRecord,
  updateRecord,
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
  status: "booking status",
  cancelledAt: "cancelled at",
  passengers: "passengers",
  pointsEarned: "points earned",
};

/** Link field ids, from the Bookings table's API Snippet (see .env.example). */
const LINKS = {
  user: "NOCODB_BOOKINGS_USER_LINK_ID",
  flight: "NOCODB_BOOKINGS_FLIGHT_LINK_ID",
};

/**
 * Loyalty points for a booking total: 1 point per whole dollar, rounded down.
 * The total is rounded to cents first so floating-point noise such as
 * 0.1 * 3 = 0.30000000000000004 cannot cost or gain a point.
 */
function pointsForTotal(total) {
  const cents = Math.round(Number(total) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.floor(cents / 100);
}

/** A stored "points earned" value as a whole, non-negative number. */
function toPoints(value) {
  const points = Math.floor(Number(value));
  return Number.isFinite(points) && points > 0 ? points : 0;
}

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
  const stored = record[FIELDS.passengers];
  const passengers = stored ? (typeof stored === "string" ? JSON.parse(stored) : stored) : [{ fullName: record[FIELDS.fullName] || "" }];
  return {
    id: record.Id,
    bookingId: record[FIELDS.bookingId] ?? record.Id,
    fullName: record[FIELDS.fullName] || "",
    userId: linkedId(record[FIELDS.user]),
    flightRecordId: linkedId(record[FIELDS.flight]),
    createdAt: record.CreatedAt,
    status: record[FIELDS.status] || "Active",
    cancelledAt: record[FIELDS.cancelledAt] || null,
    passengers,
    pointsEarned: toPoints(record[FIELDS.pointsEarned]),
  };
}

function linkFieldId(name) {
  const envName = LINKS[name];
  const id = process.env[envName];
  if (!id) throw new Error(`${envName} is not set in .env`);
  return id;
}

/**
 * Creates a booking for one or more passengers and links it to the user
 * and the flight. If linking fails the half-made row is removed, so a booking
 * never exists without its owner.
 */
async function create({ userId, flightRecordId, fullName, passengers = [{ fullName }], pointsEarned = 0 }) {
  const userLink = linkFieldId("user");
  const flightLink = linkFieldId("flight");

  const created = await createRecord("bookings", {
    [FIELDS.fullName]: fullName,
    [FIELDS.status]: "Active",
    [FIELDS.passengers]: passengers,
    [FIELDS.pointsEarned]: toPoints(pointsEarned),
  });

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
    status: "Active",
    cancelledAt: null,
    passengers,
    pointsEarned: toPoints(pointsEarned),
    createdAt: created.CreatedAt || null,
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
    .filter((booking) => userId != null && String(booking.userId) === String(userId));
}

async function findByBookingId(bookingId) {
  const record = await findRecord("bookings", {
    where: whereEquals([[FIELDS.bookingId, bookingId]]),
  });
  return record ? toBooking(record) : null;
}

async function cancel(booking) {
  const cancelledAt = new Date().toISOString();
  await updateRecord("bookings", booking.id, {
    [FIELDS.status]: "Cancelled",
    [FIELDS.cancelledAt]: cancelledAt,
  });
  return { ...booking, status: "Cancelled", cancelledAt };
}

module.exports = {
  FIELDS,
  LINKS,
  create,
  remove,
  findForUser,
  toBooking,
  findByBookingId,
  cancel,
  pointsForTotal,
};
