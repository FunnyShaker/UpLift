const { listRecords, findRecord, whereEquals } = require("../db/nocodb");

/**
 * Flights table (NocoDB).
 *
 * FIELDS maps NocoDB's column titles to the names used everywhere else in the
 * app. If the database designer renames a column in NocoDB, this is the only
 * place that needs to change.
 */
const FIELDS = {
  flightId: "flight ID",
  airline: "airline",
  from: "from",
  to: "to",
  departureDate: "departure date",
  departureTime: "departure time",
  arrivalDate: "arrival date",
  arrivalTime: "arrival time",
  duration: "duration",
  price: "price",
  isActive: "is active",
};

/** "2026-04-15T00:00:00Z" or "2026-04-15" -> "2026-04-15" */
function toDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

/** NocoDB returns "08:00:00"; the app has always used "08:00". */
function toTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function toFlight(record) {
  return {
    id: record.Id,
    flightId: record[FIELDS.flightId],
    airline: record[FIELDS.airline],
    from: record[FIELDS.from],
    to: record[FIELDS.to],
    departureDate: toDate(record[FIELDS.departureDate]),
    departureTime: toTime(record[FIELDS.departureTime]),
    arrivalDate: toDate(record[FIELDS.arrivalDate]),
    arrivalTime: toTime(record[FIELDS.arrivalTime]),
    duration: record[FIELDS.duration],
    price: Number(record[FIELDS.price]) || 0,
    isActive: Boolean(record[FIELDS.isActive]),
    createdAt: record.CreatedAt,
    updatedAt: record.UpdatedAt,
  };
}

/** Active flights, optionally filtered by route and departure date. */
async function find({ from, to, date } = {}) {
  const conditions = [];
  if (from) conditions.push([FIELDS.from, String(from).toUpperCase()]);
  if (to) conditions.push([FIELDS.to, String(to).toUpperCase()]);
  // "departure date" is a Date column, which NocoDB filters with exactDate
  if (date) conditions.push([FIELDS.departureDate, date, "exactDate"]);

  const records = await listRecords("flights", {
    where: conditions.length ? whereEquals(conditions) : undefined,
    sort: FIELDS.departureTime,
  });

  // "is active" is a checkbox, which NocoDB stores as true/false or 1/0
  // depending on the column setup. Filtering it here instead of in the query
  // keeps the search working either way.
  return records.map(toFlight).filter((flight) => flight.isActive);
}

/** One active flight by its business id ("f1"), or null. */
async function findByFlightId(flightId) {
  const record = await findRecord("flights", {
    where: whereEquals([[FIELDS.flightId, flightId]]),
  });

  if (!record) return null;

  const flight = toFlight(record);
  return flight.isActive ? flight : null;
}

module.exports = { FIELDS, find, findByFlightId, toFlight };
