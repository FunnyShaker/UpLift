const {
  findRecord,
  getRecord,
  createRecord,
  updateRecord,
  whereEquals,
} = require("../db/nocodb");

/**
 * Users table (NocoDB).
 *
 * FIELDS maps NocoDB's column titles to the names used everywhere else in the
 * app. If the database designer renames a column in NocoDB, this is the only
 * place that needs to change.
 */
const FIELDS = {
  email: "email",
  password: "password",
  fullName: "full name",
  userType: "user type",
  country: "country",
  phone: "phone number",
};

function toUser(record) {
  return {
    id: record.Id,
    email: record[FIELDS.email],
    password: record[FIELDS.password],
    fullName: record[FIELDS.fullName],
    userType: record[FIELDS.userType],
    country: record[FIELDS.country] || "",
    phone: record[FIELDS.phone] || "",
    createdAt: record.CreatedAt,
    updatedAt: record.UpdatedAt,
  };
}

/** The user shape that is safe to send back to the client (no password). */
function toPublicUser(user) {
  return {
    fullName: user.fullName,
    email: user.email,
    userType: user.userType,
    country: user.country || "",
    phone: user.phone || "",
  };
}

async function findByEmail(email) {
  if (!email) return null;

  const record = await findRecord("users", {
    where: whereEquals([[FIELDS.email, email]]),
  });

  return record ? toUser(record) : null;
}

async function findById(id) {
  if (!id) return null;

  const record = await getRecord("users", id);
  return record && record[FIELDS.email] ? toUser(record) : null;
}

async function create({ email, password, fullName, userType }) {
  const created = await createRecord("users", {
    [FIELDS.email]: email,
    [FIELDS.password]: password,
    [FIELDS.fullName]: fullName,
    [FIELDS.userType]: userType,
  });

  return {
    id: created?.Id,
    email,
    password,
    fullName,
    userType,
    country: "",
    phone: "",
  };
}

/** Updates the profile fields a user is allowed to change. */
async function updateById(id, { fullName, country, phone }) {
  const patch = {};
  if (fullName !== undefined) patch[FIELDS.fullName] = fullName;
  if (country !== undefined) patch[FIELDS.country] = country;
  if (phone !== undefined) patch[FIELDS.phone] = phone;

  if (Object.keys(patch).length > 0) {
    await updateRecord("users", id, patch);
  }

  return findById(id);
}

module.exports = {
  FIELDS,
  findByEmail,
  findById,
  create,
  updateById,
  toPublicUser,
};
