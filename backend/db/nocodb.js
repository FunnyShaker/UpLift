/**
 * NocoDB REST client (Data APIs v2).
 *
 * Every table read/write goes through here so the rest of the backend never
 * deals with raw HTTP, the API token, or NocoDB URLs. The models on top of
 * this file own the field-name mapping.
 *
 * Endpoint shape: {NOCODB_URL}/api/v2/tables/{tableId}/records
 */

// Table name -> the .env variable holding that table's NocoDB table id
const TABLE_ENV = {
  users: "NOCODB_TABLE_USERS",
  flights: "NOCODB_TABLE_FLIGHTS",
  searches: "NOCODB_TABLE_SEARCHES",
};

const DEFAULT_LIMIT = 200;

function tableId(table) {
  const envName = TABLE_ENV[table];
  const id = process.env[envName];
  if (!id) {
    throw new Error(`${envName} is not set in .env (needed for the "${table}" table)`);
  }
  return id;
}

function recordsPath(table) {
  return `/api/v2/tables/${tableId(table)}/records`;
}

async function request(method, path, { query, body } = {}) {
  const baseUrl = (process.env.NOCODB_URL || "").replace(/\/+$/, "");
  const token = process.env.NOCODB_TOKEN || "";

  if (!baseUrl) throw new Error("NOCODB_URL is not set in .env");
  if (!token) throw new Error("NOCODB_TOKEN is not set in .env");

  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "xc-token": token,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Could not reach NocoDB at ${baseUrl}: ${err.message}`);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = payload?.msg || payload?.message || text || response.statusText;
    const err = new Error(`NocoDB ${method} ${path} failed (${response.status}): ${detail}`);
    err.status = response.status;
    throw err;
  }

  return payload;
}

/**
 * Builds NocoDB's `where` query string: (field,eq,value)~and(field,eq,value).
 *
 * Date columns are the exception - NocoDB rejects a plain value there and wants
 * a sub-operator, as in (departure date,eq,exactDate,2026-04-15). Pass it as a
 * third item in the condition: [field, value, "exactDate"].
 *
 * NocoDB treats , ( ) as syntax inside that string, so they are stripped from
 * values before they go on the wire. An "eq" match then simply finds nothing
 * rather than matching the wrong row.
 */
function whereEquals(conditions) {
  return conditions
    .map(([field, value, subOperator]) => {
      const safeValue = String(value).replace(/[(),]/g, "");
      return subOperator
        ? `(${field},eq,${subOperator},${safeValue})`
        : `(${field},eq,${safeValue})`;
    })
    .join("~and");
}

async function listRecords(table, { where, sort, limit = DEFAULT_LIMIT } = {}) {
  const data = await request("GET", recordsPath(table), { query: { where, sort, limit } });
  return data?.list || [];
}

async function findRecord(table, { where, sort } = {}) {
  const [record] = await listRecords(table, { where, sort, limit: 1 });
  return record || null;
}

async function getRecord(table, id) {
  return request("GET", `${recordsPath(table)}/${id}`);
}

async function createRecord(table, data) {
  const created = await request("POST", recordsPath(table), { body: data });
  return Array.isArray(created) ? created[0] : created;
}

async function updateRecord(table, id, data) {
  const updated = await request("PATCH", recordsPath(table), { body: { Id: id, ...data } });
  return Array.isArray(updated) ? updated[0] : updated;
}

/**
 * Links one record to another through a Links column.
 * `linkFieldId` is the column id of the link field, from NocoDB's API snippet
 * for that table (see NOCODB_SEARCHES_USER_LINK_ID in .env.example).
 */
async function linkRecord(table, linkFieldId, recordId, linkedRecordId) {
  return request(
    "POST",
    `/api/v2/tables/${tableId(table)}/links/${linkFieldId}/records/${recordId}`,
    { body: { Id: linkedRecordId } },
  );
}

/** Cheap connectivity probe: succeeds only if URL, token and table id all work. */
async function ping() {
  await listRecords("flights", { limit: 1 });
  return true;
}

module.exports = {
  whereEquals,
  listRecords,
  findRecord,
  getRecord,
  createRecord,
  updateRecord,
  linkRecord,
  ping,
  TABLE_ENV,
};
