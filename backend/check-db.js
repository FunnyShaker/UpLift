require('dotenv').config();
const { listRecords, TABLE_ENV } = require('./db/nocodb');
const User = require('./models/User');
const Flight = require('./models/Flight');
const Search = require('./models/Search');

/**
 * Verifies the NocoDB setup: credentials, table ids, and column titles.
 * Run with: npm run check-db
 */

const TABLES = [
  { name: 'users', label: 'Users', fields: User.FIELDS },
  { name: 'flights', label: 'Flights', fields: Flight.FIELDS },
  { name: 'searches', label: 'Search Details', fields: Search.FIELDS },
];

async function checkTable({ name, label, fields }) {
  const envName = TABLE_ENV[name];

  if (!process.env[envName]) {
    console.log(`- ${label}: skipped (${envName} not set in .env)`);
    return true;
  }

  try {
    const records = await listRecords(name, { limit: 200 });
    console.log(`- ${label}: OK, ${records.length} row(s)`);

    if (records.length > 0) {
      const columns = Object.keys(records[0]);
      const missing = Object.values(fields).filter((title) => !columns.includes(title));

      if (missing.length > 0) {
        console.log(`  WARNING: columns not found in NocoDB: ${missing.join(', ')}`);
        console.log(`  Update the FIELDS map in models/ to match the real column titles.`);
      }
    }

    return true;
  } catch (err) {
    console.log(`- ${label}: FAILED - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`NocoDB URL: ${process.env.NOCODB_URL || '(not set)'}`);
  console.log(`API token:  ${process.env.NOCODB_TOKEN ? 'set' : '(not set)'}`);
  console.log('');

  const results = [];
  for (const table of TABLES) {
    results.push(await checkTable(table));
  }

  console.log('');
  if (results.every(Boolean)) {
    console.log('All configured tables are reachable.');
  } else {
    console.log('One or more tables failed. Check the values in backend/.env.');
    process.exit(1);
  }
}

main();
