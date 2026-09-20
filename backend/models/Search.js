const { createRecord, linkRecord } = require("../db/nocodb");

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
};

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

module.exports = { FIELDS, log };
