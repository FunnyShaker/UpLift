const { listRecords, createRecord, linkRecord, whereEquals } = require("../db/nocodb");

/**
 * Search Details table (NocoDB).
 *
 * Records what users search for. "search ID" is left to NocoDB, and "user" is
 * a Links column, so the row is created first and linked to the Users record
 * afterwards.
 */
const FIELDS = {
  from: "from",
  to: "to",
  departureDate: "departure date",
  user: "user",
};

/** How many recent rows to pull when looking up a user's last search. */
const LATEST_LOOKUP_LIMIT = 10;

/** "2026-04-15T00:00:00Z" or "2026-04-15" -> "2026-04-15" */
function toDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

/**
 * NocoDB expands the "user" Links column as the linked record, but gives an
 * array instead of an object when the column is set up as many-to-many.
 */
function linkedUserId(value) {
  const linked = Array.isArray(value) ? value[0] : value;
  return linked?.Id ?? null;
}

function toSearch(record) {
  return {
    id: record.Id,
    from: record[FIELDS.from] || "",
    to: record[FIELDS.to] || "",
    date: toDate(record[FIELDS.departureDate]),
    userId: linkedUserId(record[FIELDS.user]),
    createdAt: record.CreatedAt,
  };
}

/**
 * Stores one search. Returns the new record id, or null when the search table
 * is not configured. Linking to the user is skipped unless
 * NOCODB_SEARCHES_USER_LINK_ID is set (see .env.example).
 */
async function log({ from, to, date, userId }) {
  if (!process.env.NOCODB_TABLE_SEARCHES) return null;

  const created = await createRecord("searches", {
    [FIELDS.from]: from ? String(from).toUpperCase() : null,
    [FIELDS.to]: to ? String(to).toUpperCase() : null,
    [FIELDS.departureDate]: date || null,
  });

  const linkFieldId = process.env.NOCODB_SEARCHES_USER_LINK_ID;
  if (created?.Id && userId && linkFieldId) {
    await linkRecord("searches", linkFieldId, created.Id, userId);
  }

  return created?.Id || null;
}

/**
 * The most recent search of one user, or null when they have not searched yet.
 *
 * NocoDB only filters a Links column by the linked record's display value, which
 * on Users is the email - (user,eq,<id>) and (user.Id,eq,<id>) both match
 * nothing. So the query goes by email and the linked record id is confirmed
 * afterwards, which also keeps the result right if that display value changes.
 *
 * Rows with every filter empty are skipped: they say nothing about what the
 * user was looking for.
 */
async function findLatestForUser({ userId, email }) {
  if (!process.env.NOCODB_TABLE_SEARCHES || !email) return null;

  const records = await listRecords("searches", {
    where: whereEquals([[FIELDS.user, email]]),
    sort: "-CreatedAt",
    limit: LATEST_LOOKUP_LIMIT,
  });

  const searches = records
    .map(toSearch)
    .filter((search) => !userId || search.userId === userId);

  return searches.find((search) => search.from || search.to || search.date) || null;
}

module.exports = { FIELDS, log, findLatestForUser, toSearch };
