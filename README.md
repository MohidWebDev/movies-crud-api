# Movies CRUD API

Backend REST API for the Movies App — built with Express, MongoDB (Mongoose), and Cloudinary for poster image storage.

Frontend repo: [movies-crud-frontend](https://github.com/MohidWebDev/movies-crud-frontend)

## Features

- Full CRUD for movies (Create, Read, Update, Delete) with pagination, genre filter, search and sorting
- JWT authentication (access + refresh tokens) with `user` and `admin` roles
- Movie reviews with ratings
- Input validation with `express-validator`
- Centralized error handling
- Poster image uploads via Multer, stored on Cloudinary
- Rate limiting and security headers (`express-rate-limit`, `helmet`)
- CORS configured for the frontend origin (`CLIENT_URL`)
- Automated tests with Jest and Supertest

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Cloudinary (image storage)
- Multer (file upload handling)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

Required variables:
| Variable | Description |
|---|---|
| `PORT` | Port the server runs on (default: 3000) |
| `MONGODB_URI` | Your MongoDB connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `JWT_SECRET` | Secret used to sign access tokens |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin allowed by CORS (e.g. `http://localhost:5173`) |
| `TRUST_PROXY` | Optional. Number of reverse proxies in front of the app (e.g. `1` on Render or Railway). Leave unset locally. |

### 3. Run the server

```bash
npm start
```

The API will run at `http://localhost:3000` (or your configured `PORT`).

## API Endpoints

**Movies**

| Method | Endpoint                 | Access    | Description                                         |
| ------ | ------------------------ | --------- | --------------------------------------------------- |
| GET    | `/api/movies`            | Public    | List movies (pagination, `genre`, `search`, `sort`) |
| GET    | `/api/movies/stats`      | Public    | Movie statistics                                    |
| GET    | `/api/movies/:id`        | Public    | Get a single movie                                  |
| POST   | `/api/movies`            | Logged in | Create a new movie                                  |
| POST   | `/api/movies/:id/poster` | Logged in | Upload/replace a movie's poster                     |
| PUT    | `/api/movies/:id`        | Admin     | Update a movie (full)                               |
| PATCH  | `/api/movies/:id`        | Admin     | Update a movie (partial)                            |
| DELETE | `/api/movies/:id`        | Admin     | Delete a movie and its reviews                      |

**Reviews**

| Method | Endpoint                       | Access    | Description              |
| ------ | ------------------------------ | --------- | ------------------------ |
| GET    | `/api/movies/:movieId/reviews` | Public    | List reviews for a movie |
| POST   | `/api/movies/:movieId/reviews` | Logged in | Add a review             |
| GET    | `/api/reviews/:id`             | Public    | Get a single review      |
| PATCH  | `/api/reviews/:id`             | Admin     | Update a review          |
| DELETE | `/api/reviews/:id`             | Admin     | Delete a review          |

**Auth**

| Method | Endpoint             | Access    | Description            |
| ------ | -------------------- | --------- | ---------------------- |
| POST   | `/api/auth/register` | Public    | Create an account      |
| POST   | `/api/auth/login`    | Public    | Log in                 |
| POST   | `/api/auth/refresh`  | Public    | Get a new access token |
| POST   | `/api/auth/logout`   | Public    | Log out                |
| GET    | `/api/auth/me`       | Logged in | Get the current user   |

Protected routes expect an `Authorization: Bearer <accessToken>` header.

## Connecting a Frontend

This API has CORS configured for the origin in CLIENT_URL — including the paired frontend, [movies-crud-frontend](https://github.com/MohidWebDev/movies-crud-frontend), which expects this API to be reachable via a `VITE_API_BASE_URL` environment variable (e.g. `http://localhost:3000` for local development).

## Testing

Tests use **Jest** and **Supertest** against an in-memory MongoDB (`mongodb-memory-server`), so no real database, Cloudinary account or `.env` file is needed.

```bash
npm test                # run all tests
npm run test:coverage   # run tests and write a coverage report to coverage/
```

### What is tested

| Test file                                                    | Covers                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `tests/movies.read.test.js`                                  | `GET /api/movies` (pagination, genre filter, search, sorting, query validation) and `GET /api/movies/:id` |
| `tests/movies.create.test.js`                                | `POST /api/movies` (auth, success, input sanitizing, every validation rule)                               |
| `tests/movies.update.test.js`                                | `PUT` and `PATCH /api/movies/:id` (admin only, 404, validation)                                           |
| `tests/movies.delete.test.js`                                | `DELETE /api/movies/:id` (admin only, review cleanup, Cloudinary poster cleanup)                          |
| `tests/movies.poster.test.js`                                | `POST /api/movies/:id/poster` (upload, replace, file type and size limits)                                |
| `tests/auth.middleware.test.js`                              | `protect` and `authorize` middleware (missing, invalid, expired tokens, roles)                            |
| `tests/errors.test.js`                                       | Error handler, unknown routes, unexpected 500s, helmet and CORS headers                                   |
| `tests/movies.search.test.js`                                | Search input handling: regex special characters, length limit, repeated parameter, year search            |
| `tests/movies.stats.test.js`                                 | `GET /api/movies/stats`: weighted ranking, rounding, 15-movie cap                                         |
| `tests/movies.order.test.js`                                 | Stable ordering across pages, including ties in `sort=year`                                               |
| `tests/movies.patch.security.test.js`                        | `PATCH` ignores fields outside the allowed list (poster, dotted paths, `$set`)                            |
| `tests/reviews.list.test.js`                                 | Review list: newest first, capped at 100, only the requested movie                                        |
| `tests/auth.validation.test.js`                              | Register and login validation, protection against operator injection                                      |
| `tests/errorHandler.production.test.js`                      | Internal error details are hidden in production                                                           |
| `tests/proxy.enabled.test.js`, `tests/proxy.default.test.js` | The `TRUST_PROXY` setting                                                                                 |

Not covered yet: creating, updating and deleting reviews, and `/api/auth/refresh`, `/api/auth/logout` and `/api/auth/me`.

### How the tests are set up

- `tests/setupEnv.js` sets fake secrets so tests never use real credentials.
- `tests/setupDb.js` starts an in-memory MongoDB and wipes every collection after each test, so tests are independent.
- `tests/helpers/` has factories for movies and a helper that creates a user with a valid JWT.
- Cloudinary is mocked (`jest.unstable_mockModule`, because the project uses native ES modules), so no test uploads anything.
- `npm run e2e:server` starts the API on an in-memory database with seeded data. The frontend's Playwright tests use it (see the frontend README).

### Testing approach: unit, integration and end-to-end

- **Unit tests** check one piece in isolation. Example: the error handler is called directly with fake request and response objects.
- **Integration tests** send real HTTP requests through the whole Express app, with real middleware, validators, controllers and Mongoose models against an in-memory database. Most of this suite is integration testing, because for an API that is where most bugs live.
- **End-to-end tests** drive the complete system (browser, frontend, backend and database together). They are not part of this project.

Only the outside world is mocked: Cloudinary, because it is a paid network service.

## Performance and Security

The app went through a performance and security audit. The findings, measurements and fixes are in [`docs/audit-report.md`](docs/audit-report.md).

Two probe scripts repeat the measurements. Both run against a temporary in-memory database, never your real one:

```bash
npm run perf:probe       # seeds 50k movies and 100k reviews, times the key queries and shows explain plans
npm run security:probe   # sends suspicious requests (regex input, operator injection, PATCH fields...) and prints verdicts
```

### What was fixed

- Search input is escaped and length-limited (a search like `[` used to crash the request with a 500)
- Stats ranking aggregates from reviews first and only looks up the top 15 movies
- Register and login only accept plain strings (closes email enumeration and operator injection)
- `PATCH /api/movies/:id` only accepts the movie fields, nothing else
- Movie lists have a stable order (a compound `year + _id` index), review lists return the newest 100, and read queries use `.lean()`
- Internal error messages are hidden in production, and `TRUST_PROXY` is supported
- Vulnerable dependencies were updated

### Deployment notes

- Set `NODE_ENV=production`. Error hiding and the cookie `secure`/`sameSite` flags depend on it.
- Behind a single reverse proxy (Render, Railway...), set `TRUST_PROXY=1` so rate limiting sees each visitor's real IP. Leave it unset when the app is reached directly.
- If a secret is ever committed, rotate it. Deleting the commit is not enough.

### Known limitations

- Search is a substring match across several fields, so it cannot use an index and scans the collection. It was ~0.5 s at 50k movies.
- A movie's review list returns its newest 100 reviews.
- Five low-severity advisories remain in dev tooling (`deepmerge`, via `jest`). The only offered fix is a Jest downgrade, and the code never passes untrusted input to it.
