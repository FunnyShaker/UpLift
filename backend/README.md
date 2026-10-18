# UpLift Backend

Express API for the UpLift platform. Data lives in **NocoDB** (migrated from MongoDB Atlas).

## Setup

```bash
cd backend
npm install
cp .env.example .env     # fill in the NocoDB values
npm run check-db         # verifies credentials, table ids and column names
npm run dev              # http://localhost:3500, restarts on file changes
```

`npm run dev` from the repo root starts this API and the React app together.

`npm run check-db` is the fastest way to confirm the database side is wired up. It
reports each table, its row count, and warns if a column title in NocoDB no longer
matches what the code expects.

## Environment variables

See `.env.example`. The NocoDB ones are:

| Variable | What it is |
|---|---|
| `NOCODB_URL` | Instance URL, e.g. `https://app.nocodb.com` |
| `NOCODB_TOKEN` | API token (Account Settings → Tokens) |
| `NOCODB_TABLE_USERS` | Table id of Users |
| `NOCODB_TABLE_FLIGHTS` | Table id of Flights |
| `NOCODB_TABLE_SEARCHES` | Table id of Search Details |
| `NOCODB_SEARCHES_USER_LINK_ID` | Optional: link field id used to attach a search to a user |
| `NOCODB_TABLE_BOOKINGS` | Table id of Bookings |
| `NOCODB_TABLE_PAYMENTS` | Table id of Payments |
| `NOCODB_TABLE_FAVOURITES` | Table id of Favourite Flights |
| `NOCODB_BOOKINGS_USER_LINK_ID`, `NOCODB_BOOKINGS_FLIGHT_LINK_ID` | Link field ids of `user` and `flight` on Bookings |
| `NOCODB_PAYMENTS_USER_LINK_ID`, `NOCODB_PAYMENTS_BOOKING_LINK_ID` | Link field ids of `user` and `booking` on Payments |
| `NOCODB_FAVOURITES_USER_LINK_ID` | Link field id of `user` on Favourite Flights |
| `NOCODB_FAVOURITES_FLIGHT_LINK_ID` | Link field id of `flight` on Favourite Flights |

## How the database layer works

```
routes/        HTTP handlers
models/        one file per table - owns the NocoDB column-title mapping
db/nocodb.js   NocoDB REST client (API v2), the only place that does HTTP
```

NocoDB column titles contain spaces (`"full name"`, `"departure date"`), so each
model has a `FIELDS` map that translates them into the camelCase names used by the
API and the frontend:

```js
const FIELDS = { fullName: "full name", userType: "user type", ... }
```

**If the database designer renames a column in NocoDB, the `FIELDS` map in that
model is the only thing that needs to change.** `npm run check-db` will point out
which one.

## API

Base URL: `http://localhost:3500` (or the deployed backend URL).
Authenticated routes expect `Authorization: Bearer <token>`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | no | Reports whether NocoDB is reachable |
| `POST` | `/api/signup` | no | Create account, returns `{ user, token }` |
| `POST` | `/api/login` | no | Log in, returns `{ user, token }` |
| `POST` | `/api/logout` | no | No-op; the client drops the token |
| `GET` | `/api/home` | yes | `{ user: { fullName, email, userType } }` |
| `GET` | `/api/flights` | optional | `{ count, flights, returnFlights }`, filters: `from`, `to`, `date`, `roundTrip`, `returnDate` |
| `GET` | `/api/flights/:flightId` | no | `{ flight }` for one active flight |
| `GET` | `/api/searches/latest` | yes | `{ search, count, flights, returnFlights }` for the user's last search |
| `GET` | `/api/profile` | yes | `{ fullName, email, userType, country, phone }` |
| `PUT` | `/api/profile` | yes | Updates `fullName`, `country`, `phone`; returns the profile |
| `POST` | `/api/bookings` | yes | Books a flight and records its payment, returns `{ booking }` |
| `GET` | `/api/bookings` | yes | `{ count, bookings: [...] }`, each with its `flight` |
| `GET` | `/api/favourites` | yes | `{ count, flights: [...] }` the user has favourited |
| `POST` | `/api/favourites` | yes | Body `{ flightId }`; returns the updated favourites |
| `DELETE` | `/api/favourites/:flightId` | yes | Returns the updated favourites |

`PUT /api/profile` only accepts those three fields - `email` and `userType` are
read-only and anything else in the body is ignored. Values are trimmed, and the
route answers `400` for an empty `fullName` or a phone that is not 7-20
characters of digits and `+ - ( )`. Sending `"phone": ""` clears the field.

A flight looks like this (unchanged from before the migration):

```json
{
  "flightId": "f2",
  "airline": "WestJet",
  "from": "YYZ",
  "to": "NYC",
  "departureDate": "2026-04-15",
  "departureTime": "10:00",
  "arrivalDate": "2026-04-15",
  "arrivalTime": "12:00",
  "duration": "2h",
  "price": 199,
  "isActive": true
}
```

Only flights with `is active` checked are returned.

### Search Details

When `/api/flights` is called with a filter, the search is written to the Search
Details table. If a valid token was sent and `NOCODB_SEARCHES_USER_LINK_ID` is
configured, the row is also linked to that user. Logging a search never blocks or
fails the flight response.

`GET /api/searches/latest` reads that history back: it returns the user's most
recent search together with the flights matching it, so the flights page can open
on where they left off. Users with no history get `{ "search": null, "flights": [] }`
and the page falls back to the full list.

```json
{
  "search": { "from": "YYZ", "to": "LAX", "date": "2026-04-15", "createdAt": "..." },
  "count": 2,
  "flights": [ ... ]
}
```

The flights are looked up by that route inside this endpoint rather than by
sending the client back to `/api/flights`, which would record the replayed search
as a new one and pin every user's history to whatever they searched first.

NocoDB only filters a Links column by the linked record's display value - which on
Users is the email - so the lookup queries by email and then confirms the linked
record id in JS. `(user,eq,<id>)` and `(user.Id,eq,<id>)` both match nothing.

### Round trips

With `roundTrip=true`, `/api/flights` also returns `returnFlights`: active flights
on the reverse route (`to` → `from`), on `returnDate` when one is given. Both
`from` and `to` are needed, otherwise `returnFlights` is empty. A `returnDate`
before `date` is a `400`. Each leg is booked as its own booking.

The return date is saved in the `return date` column of Search Details, but only
when one was sent, so one-way searches are still recorded on a base where that
column does not exist yet.

### Bookings and payments

`POST /api/bookings` takes:

```json
{
  "flightId": "f2",
  "fullName": "Jane Doe",
  "payment": { "cardholderName": "Jane Doe", "cardNumber": "4111 1111 1111 1111", "expiryDate": "10/28", "cvv": "123" }
}
```

The card is checked the same way the booking form checks it (16 digits, `MM/YY`
not in the past, 3-4 digit CVV) and the route answers `400` with a message the
form can show. The Payments row stores the card number masked to its last four
digits (`**** **** **** 1111`); the full number and the CVV are never saved.

The booking row is created first, then the payment. If the payment cannot be
recorded the booking is deleted again, so there is never a booking without a
payment.

### Favourite Flights

Each favourite is linked to the user and to the exact flight, and also keeps the
route (`from`, `to`). If `NOCODB_FAVOURITES_FLIGHT_LINK_ID` is not set, favourites
fall back to the route alone and cover every active flight on it.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Runs the API |
| `npm run dev` | Runs the API with auto-restart on file changes |
| `npm run check-db` | Verifies the NocoDB connection, tables and columns |
| `npm run seed` | Adds the demo flights that are missing from the Flights table (safe to re-run) |

## Notes

- Passwords are stored as plain text, carried over from the original schema.
  Fine for the course demo, but it should be hashed before this goes anywhere real.
- `JWT_SECRET` must be set in `.env`; without it the code falls back to a
  well-known default string.
