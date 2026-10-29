# Performance & Security Audit

**Date:** 27 October 2026
**Scope:** `movies-crud-api` (Express + MongoDB) and `movies-crud-frontend` (React + Vite)
**Status:** Audit and fixes complete. Results after the fixes are at the end of this report.

## Summary

| ID  | Area          | Finding                                                                                                      | Severity               | Evidence    | Fix             | Status |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------- | --------------- | ------ |
| P1  | Backend perf  | Stats endpoint looks up the reviews of every movie before limiting to 15 (2.3 s at 50k movies)               | High                   | Measured    | B2              | Fixed  |
| P2  | Backend perf  | Search cannot use an index and scans every movie (~0.5 s at 50k)                                             | Medium                 | Measured    | Design decision | Fixed  |
| P3  | Backend perf  | Review list is unbounded (2,644 rows in one response)                                                        | Medium                 | Measured    | B6              | Fixed  |
| P4  | Backend perf  | Pagination has no stable sort order; reads use full Mongoose documents instead of `.lean()`                  | Low                    | Code review | B6              | Fixed  |
| F1  | Frontend perf | Every render of `MovieGrid` re-creates all cards, including renders caused only by typing                    | Medium                 | Measured    | B3              | Fixed  |
| F2  | Frontend perf | Genre dropdown receives new props on every render                                                            | Low                    | Code review | B3              | Fixed  |
| F3  | Frontend perf | 15 posters (3.4 MB) all load at once, only 2 visible on a phone; no lazy loading, no resizing                | Medium                 | Measured    | B8              | Fixed  |
| S1  | Security      | `search` is passed to `new RegExp()` unescaped: `search=[` returns 500 (ReDoS also possible, not reproduced) | High                   | Reproduced  | B1              | Fixed  |
| S2  | Security      | Error responses expose internal messages (regex error text, `Cast to string failed...`)                      | Low                    | Reproduced  | B7              | Fixed  |
| S3  | Security      | Operator injection on register (`email: {"$regex": ...}`) returns 409 vs 400, revealing which emails exist   | Medium                 | Reproduced  | B4              | Fixed  |
| S4  | Security      | `PATCH /api/movies/:id` passes the whole body to the update, so `poster.publicId` can be overwritten         | Medium                 | Reproduced  | B5              | Fixed  |
| S5  | Security      | `trust proxy` not set; behind a proxy all users share one rate-limit bucket                                  | Medium (once deployed) | Reproduced  | B7              | Fixed  |
| S6  | Security      | 8 vulnerable backend dependencies (1 critical, 4 high, 3 moderate)                                           | High                   | `npm audit` | B9              | Fixed  |
| S7  | Security      | 5 vulnerable frontend dependencies (2 critical, 3 high), all in build/dev tooling or Node-only code          | Low (practical)        | `npm audit` | B9              | Fixed  |
| S8  | Security      | `.gitignore` lists only `.env`, not `.env.*` variants                                                        | Low                    | Code review | B7              | Fixed  |

## What is already good

- **Indexes work** for genre filtering (`IXSCAN`, 9 ms) and year sorting (`IXSCAN`, 27 ms).
- **Search input is debounced** (400 ms) on the frontend.
- **React Query** is configured sensibly (60 s `staleTime`, no refetch on window focus).
- **helmet** headers are present and `x-powered-by` is hidden.
- **CORS** only allows the configured client origin.
- **Refresh cookie** is `HttpOnly` with `SameSite`.
- **Register cannot create an admin**: a `role: "admin"` in the body is ignored.
- **No secrets in Git history** in either repo (no `.env`, no connection strings).
- **No N+1 query pattern** found: no controller runs a query inside a loop.

## Backend performance (baseline)

Method: `npm run perf:probe` starts an in-memory MongoDB, seeds 50,000 movies and 100,000 reviews, and reports the median of 3 runs. Absolute times are for a local in-memory database; the shape of the results is what matters.

| Query                        | Plan                      | Docs examined | Returned | Time         |
| ---------------------------- | ------------------------- | ------------- | -------- | ------------ |
| List, no filter              | COLLSCAN (stops after 30) | 30            | 30       | 35 ms        |
| Filter `genre=Comedy`        | IXSCAN                    | 30            | 30       | 9 ms         |
| Sort by year                 | IXSCAN                    | 30            | 30       | 27 ms        |
| Search `"dark"`              | COLLSCAN                  | 455           | 30       | 396 ms       |
| Search `"xyzzy"` (no match)  | COLLSCAN                  | 50,000        | 0        | 481 ms       |
| Reviews of one popular movie | IXSCAN                    | 2,644         | 2,644    | 59 ms        |
| Stats aggregation            | `$lookup` on every movie  | n/a           | 15       | **2,286 ms** |

Notes:

- The listing time includes the `countDocuments` the controller runs for pagination, which scans the whole collection for search queries.
- Search cannot use an index because it combines an unanchored case-insensitive regex with an `$expr` on `year`, inside an `$or`. One un-indexable branch forces a full scan.
- Stats should aggregate from `reviews` first (using the `{ movie, createdAt }` index), keep the top 15, and only then look up those movies.

## Frontend performance (baseline)

Method: temporary `console.count` calls in `MovieGrid`. React Strict Mode renders twice in development, so logged numbers are halved.

- One search session: **17 real renders** of `MovieGrid`, **9** of which re-created all 16 cards (**144 card renders**). On wide screens the page size is 30, so the cost roughly doubles with a bigger catalog.
- Images (Network tab, Img filter, cache disabled): **15 posters, 3,378 kB** transferred, average about 225 kB, largest 487 kB, all downloaded although only 2 cards were visible. All are plain JPEG (no `f_auto`).

## Security probe

Method: `npm run security:probe` sends the suspicious requests to the app against an in-memory database.

| Check                                                | Observed                              | Verdict        |
| ---------------------------------------------------- | ------------------------------------- | -------------- |
| `GET /api/movies?search=[`                           | 500, regex error in the body          | Issue (S1, S2) |
| Register `email={"$regex":"^vict"}` (matches a user) | 409                                   | Issue (S3)     |
| Register `email={"$regex":"^zzz"}` (matches nobody)  | 400                                   | Issue (S3)     |
| Register with `role: "admin"`                        | Stored role `user`                    | OK             |
| `PATCH` with `poster.publicId` in the body           | 200, value overwritten                | Issue (S4)     |
| helmet headers                                       | All present, `x-powered-by` hidden    | OK             |
| CORS                                                 | Only the configured origin is allowed | OK             |
| `trust proxy`                                        | `false`                               | Issue (S5)     |
| Refresh cookie                                       | `HttpOnly`, `SameSite=Lax`            | OK             |

S4 and S6 are linked: the overwritten `publicId` is later passed to `cloudinary.uploader.destroy()`, and the installed Cloudinary SDK has an argument-injection advisory.

## Dependencies

- **Backend (8):** `multer` (high, several DoS issues; the upload route is open to any logged-in user), `body-parser` (high, DoS), `proxy-addr` (critical, IP spoofing; relevant once `trust proxy` is enabled), `cloudinary` (high; the fix is a breaking major upgrade), `ip-address`, `morgan`, `qs` (moderate). Seven are fixed by `npm audit fix`.
- **Frontend (5):** `vite`, `source-map-js`, `follow-redirects`, and `solid-js`/`seroval` (most likely via the React Query devtools). All are fixed by `npm audit fix` with no breaking changes. `vite` and `@vitejs/plugin-react` are listed under `dependencies` and belong in `devDependencies`.

## Secrets

Checked both repositories with `git log --all -- .env`, `git log --all -S "mongodb+srv"`, `git log --all -S "API_SECRET"` and `git grep` for connection strings and keys. No `.env` file and no connection string was ever committed. The `API_SECRET` matches are variable names and `your_api_secret` placeholders.

## How to reproduce

```bash
# backend
npm run perf:probe
npm run security:probe
npm audit

# frontend
npm audit
```

## Results after fixes

### Backend performance

Same probe (`npm run perf:probe`, 50k movies and 100k reviews, median of 3 runs). Each run seeds new random data, so small differences between runs are noise.

| Query                       | Before                            | After                          |
| --------------------------- | --------------------------------- | ------------------------------ |
| Stats aggregation           | 3,398 ms (old pipeline, same run) | **607 ms** (about 5.6x faster) |
| Reviews of a popular movie  | 2,644 documents, 59 ms            | **100 documents, 3 ms**        |
| Sort by year                | IXSCAN, 27 ms                     | IXSCAN, 30 ms (unchanged)      |
| Filter `genre=Comedy`       | 30 documents examined, 9 ms       | 182 documents examined, 10 ms  |
| Search `"dark"` / `"xyzzy"` | 396 ms / 481 ms                   | 551 ms / 573 ms                |

Notes:

- The old stats pipeline measured 2,286 ms in the first run and 3,398 ms in the second (machine load differs between runs). In the final run the new pipeline took 607 ms.
- The genre filter examines more documents because the default order is now explicit (`_id`), so the planner walks the `_id` index. Time is unchanged. A compound `{ genre: 1, _id: 1 }` index would restore 30 examined documents if the catalog grows.
- **Search was not changed** (finding P2, accepted as a design trade-off). Its plan now says `IXSCAN`, but that is a walk over the `_id` index that still examines all 50,000 documents when nothing matches, so it is not an index-assisted search.

### Security probe

| Check                                                  | Before                                  | After                     |
| ------------------------------------------------------ | --------------------------------------- | ------------------------- |
| `GET /api/movies?search=[`                             | 500                                     | 200, empty list           |
| Register with `$regex` email, matching vs non-matching | 409 vs 400 (reveals which emails exist) | 400 for both              |
| `PATCH` with a `poster` field                          | 200, `publicId` overwritten             | 200, `publicId` unchanged |
| `trust proxy`                                          | `false`                                 | `1` (via `TRUST_PROXY`)   |
| Register with `role: "admin"`                          | stored `user`                           | stored `user`             |
| helmet, CORS, refresh cookie flags                     | OK                                      | OK                        |

Error-message hiding in production (S2) is verified by `tests/errorHandler.production.test.js`, not by the probe.

### Frontend

- **Re-renders (F1, F2):** before, one search session caused 13 renders of `MovieGrid` and 136 card renders. `MovieCard` is now memoized and the dropdown receives stable props. A matching "after" count was not recorded.
- **Posters (F3):** before, 15 posters transferred 3,378 kB, all at once. Posters now use Cloudinary resizing and automatic format and quality, and grid images load lazily. An "after" figure was not recorded.

### Dependencies

|          | Before                             | After |
| -------- | ---------------------------------- | ----- |
| Backend  | 8 (1 critical, 4 high, 3 moderate) | 5 low |
| Frontend | 5 (2 critical, 3 high)             | 5 low |

The remaining 5 low findings in each repo are `deepmerge`, reached through `jest` (dev tooling). The only offered fix is downgrading Jest to a 2020 release, and the code never passes untrusted input to it, so they are accepted. `cloudinary` was upgraded to v2 using an npm `overrides` entry, because `multer-storage-cloudinary` still declares a v1 peer dependency. This was verified manually with a real poster upload, replacement and deletion.

### Tests

- Backend: 17 Jest suites (up from 8), including a test written first for every security fix.
- Frontend: 8 Jest suites, plus 2 Playwright end-to-end tests (app smoke test, and login + movie search) running against a seeded in-memory backend.
