const {
  listRecords,
  createRecord,
  deleteRecord,
  linkRecord,
  whereEquals,
} = require("../db/nocodb");

/**
 * Favourite Flights table (NocoDB).
 *
 * Each favourite is linked to the user and to the saved flight, and also keeps
 * its route ("from", "to"). Without NOCODB_FAVOURITES_FLIGHT_LINK_ID the flight
 * link is skipped and a favourite stands for every active flight on the route.
 */
const FIELDS = {
  favouriteId: "favourite ID",
  from: "from",
  to: "to",
  user: "user",
};

/** Only filled in when NOCODB_FAVOURITES_FLIGHT_LINK_ID is set. */
const FLIGHT_FIELD = "flight";

/** How many favourites to pull for one user. */
const USER_LOOKUP_LIMIT = 100;

function linkedId(value) {
  const linked = Array.isArray(value) ? value[0] : value;
  return linked?.Id ?? null;
}

function toFavourite(record) {
  return {
    id: record.Id,
    from: record[FIELDS.from] || "",
    to: record[FIELDS.to] || "",
    userId: linkedId(record[FIELDS.user]),
    flightRecordId: linkedId(record[FLIGHT_FIELD]),
    createdAt: record.CreatedAt,
  };
}

/** The user's favourites, newest first. Queried by email, see Booking.findForUser. */
async function findForUser({ userId, email }) {
  if (!email) return [];

  const records = await listRecords("favourites", {
    where: whereEquals([[FIELDS.user, email]]),
    sort: "-CreatedAt",
    limit: USER_LOOKUP_LIMIT,
  });

  return records
    .map(toFavourite)
    .filter((favourite) => !userId || favourite.userId === userId);
}

/** Saves a flight as a favourite of the user. */
async function create({ userId, flight }) {
  const userLink = process.env.NOCODB_FAVOURITES_USER_LINK_ID;
  if (!userLink) throw new Error("NOCODB_FAVOURITES_USER_LINK_ID is not set in .env");

  const created = await createRecord("favourites", {
    [FIELDS.from]: flight.from,
    [FIELDS.to]: flight.to,
  });

  try {
    await linkRecord("favourites", userLink, created.Id, userId);

    const flightLink = process.env.NOCODB_FAVOURITES_FLIGHT_LINK_ID;
    if (flightLink) {
      await linkRecord("favourites", flightLink, created.Id, flight.id);
    }
  } catch (err) {
    await deleteRecord("favourites", created.Id).catch(() => {});
    throw err;
  }

  return created.Id;
}

async function remove(id) {
  return deleteRecord("favourites", id);
}

/**
 * Whether a favourite covers a flight: the exact flight when the favourite is
 * linked to one, otherwise any flight on the same route.
 */
function covers(favourite, flight) {
  if (favourite.flightRecordId) return favourite.flightRecordId === flight.id;
  return favourite.from === flight.from && favourite.to === flight.to;
}

module.exports = { FIELDS, findForUser, create, remove, covers, toFavourite };
