require('dotenv').config();
const { createRecord } = require('./db/nocodb');
const Flight = require('./models/Flight');

const F = Flight.FIELDS;

// Demo flights. Rows already in NocoDB are left untouched - this only fills in
// flight IDs that are missing, so it is safe to run more than once.
const mockFlights = [
  {
    [F.flightId]: "f1",
    [F.airline]: "Air Canada",
    [F.from]: "YYZ",
    [F.to]: "LAX",
    [F.departureDate]: "2026-04-15",
    [F.departureTime]: "08:00:00",
    [F.arrivalDate]: "2026-04-15",
    [F.arrivalTime]: "11:30:00",
    [F.duration]: "5h 30m",
    [F.price]: 299,
    [F.isActive]: true
  },
  {
    [F.flightId]: "f2",
    [F.airline]: "WestJet",
    [F.from]: "YYZ",
    [F.to]: "NYC",
    [F.departureDate]: "2026-04-15",
    [F.departureTime]: "10:00:00",
    [F.arrivalDate]: "2026-04-15",
    [F.arrivalTime]: "12:00:00",
    [F.duration]: "2h",
    [F.price]: 199,
    [F.isActive]: true
  },
  {
    [F.flightId]: "f3",
    [F.airline]: "Air Canada",
    [F.from]: "YYZ",
    [F.to]: "NYC",
    [F.departureDate]: "2026-04-15",
    [F.departureTime]: "14:30:00",
    [F.arrivalDate]: "2026-04-15",
    [F.arrivalTime]: "16:30:00",
    [F.duration]: "2h",
    [F.price]: 189,
    [F.isActive]: true
  },
  {
    [F.flightId]: "f4",
    [F.airline]: "WestJet",
    [F.from]: "YYZ",
    [F.to]: "LAX",
    [F.departureDate]: "2026-04-16",
    [F.departureTime]: "06:00:00",
    [F.arrivalDate]: "2026-04-16",
    [F.arrivalTime]: "09:30:00",
    [F.duration]: "5h 30m",
    [F.price]: 279,
    [F.isActive]: true
  },
  {
    [F.flightId]: "f5",
    [F.airline]: "United Airlines",
    [F.from]: "LAX",
    [F.to]: "NYC",
    [F.departureDate]: "2026-04-15",
    [F.departureTime]: "13:00:00",
    [F.arrivalDate]: "2026-04-15",
    [F.arrivalTime]: "21:00:00",
    [F.duration]: "5h",
    [F.price]: 249,
    [F.isActive]: true
  },
  {
    [F.flightId]: "f6",
    [F.airline]: "Delta",
    [F.from]: "NYC",
    [F.to]: "LAX",
    [F.departureDate]: "2026-04-16",
    [F.departureTime]: "09:00:00",
    [F.arrivalDate]: "2026-04-16",
    [F.arrivalTime]: "12:00:00",
    [F.duration]: "5h",
    [F.price]: 259,
    [F.isActive]: true
  }
];

async function seedFlights() {
  try {
    let added = 0;

    for (const flight of mockFlights) {
      const flightId = flight[F.flightId];
      const existing = await Flight.findByFlightId(flightId);

      if (existing) {
        console.log(`Skipped ${flightId} - already in NocoDB`);
        continue;
      }

      await createRecord('flights', flight);
      console.log(`Added ${flightId}`);
      added++;
    }

    console.log(`Done. ${added} flight(s) added, ${mockFlights.length - added} skipped.`);
  } catch (err) {
    console.error('Error seeding flights:', err.message);
    process.exit(1);
  }
}

seedFlights();
