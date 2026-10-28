import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

// Fake config so the app can start without your real .env
// (same idea as tests/setupEnv.js)
process.env.JWT_SECRET = "probe-access-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_SECRET = "probe-refresh-secret";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.TRUST_PROXY = "1";

// Import the app AFTER the env vars are set
const { default: app } = await import("../app.js");
const { default: Movie } = await import("../models/movieModel.js");
const { default: User } = await import("../models/userModel.js");
const { default: generateToken } = await import("../utils/generateToken.js");

const results = [];
const record = (check, observed, verdict) =>
  results.push({ check, observed, verdict });
const short = (value, max = 60) => JSON.stringify(value).slice(0, max);

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  try {
    // ---- 1. Regex injection in movie search ----
    const regexRes = await request(app)
      .get("/api/movies")
      .query({ search: "[" });
    record(
      "GET /api/movies?search=[",
      `${regexRes.status} ${short(regexRes.body)}`,
      regexRes.status >= 500 ? "ISSUE" : "OK",
    );

    // ---- 2. Does the error body leak internals? ----
    const leaked =
      regexRes.status >= 500 &&
      /regular expression|unterminated|invalid/i.test(
        regexRes.body?.message ?? "",
      );
    record(
      "Error response hides internals",
      leaked ? "message exposes the regex error" : "generic or no error",
      leaked ? "ISSUE" : "OK",
    );

    // ---- 3. NoSQL operator injection on register ----
    const victim = {
      name: "Victim",
      email: "victim@example.com",
      password: "password123",
    };
    const reg = await request(app).post("/api/auth/register").send(victim);
    record(
      "Register a normal user (setup)",
      String(reg.status),
      reg.status < 300 ? "OK" : "CHECK",
    );

    const hit = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Probe",
        email: { $regex: "^vict" },
        password: "password123",
      });
    const miss = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Probe",
        email: { $regex: "^zzz" },
        password: "password123",
      });
    record(
      'Register email={"$regex":"^vict"} (matches victim)',
      `${hit.status} ${short(hit.body, 45)}`,
      "-",
    );
    record(
      'Register email={"$regex":"^zzz"} (matches nobody)',
      `${miss.status} ${short(miss.body, 45)}`,
      hit.status !== miss.status ? "ISSUE" : "OK",
    );

    // ---- 4. Can a visitor register as admin? ----
    await request(app).post("/api/auth/register").send({
      name: "Mallory",
      email: "mallory@example.com",
      password: "password123",
      role: "admin",
    });
    const mallory = await User.findOne({ email: "mallory@example.com" });
    record(
      "Register with role=admin in the body",
      `stored role: ${mallory ? mallory.role : "user not created"}`,
      mallory?.role === "admin" ? "ISSUE" : "OK",
    );

    // ---- 5. Mass assignment on PATCH /api/movies/:id ----
    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
    const token = generateToken(admin._id, admin.role);
    const movie = await Movie.create({
      title: "Heat",
      director: "Michael Mann",
      year: 1995,
      genre: ["Crime"],
      poster: {
        url: "https://res.cloudinary.com/demo/original.jpg",
        publicId: "movie-posters/original",
      },
    });
    const patch = await request(app)
      .patch(`/api/movies/${movie._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Heat (renamed)",
        poster: {
          url: "https://evil.example/x.png",
          publicId: "movie-posters/not-mine",
        },
      });
    const after = await Movie.findById(movie._id);
    record(
      "PATCH movie with a poster field in the body",
      `${patch.status}, stored publicId: ${after.poster?.publicId}`,
      after.poster?.publicId === "movie-posters/not-mine" ? "ISSUE" : "OK",
    );

    // ---- 6. helmet headers ----
    const { headers } = await request(app).get("/api/movies");
    const missing = [
      "x-content-type-options",
      "strict-transport-security",
      "x-frame-options",
    ].filter((name) => !headers[name]);
    const exposed = Boolean(headers["x-powered-by"]);
    record(
      "helmet headers",
      exposed
        ? "x-powered-by is exposed"
        : missing.length
          ? `missing: ${missing.join(", ")}`
          : "all present, x-powered-by hidden",
      exposed || missing.length ? "ISSUE" : "OK",
    );

    // ---- 7. CORS ----
    const evil = await request(app)
      .get("/api/movies")
      .set("Origin", "https://evil.example");
    const good = await request(app)
      .get("/api/movies")
      .set("Origin", process.env.CLIENT_URL);
    const evilAllowed = evil.headers["access-control-allow-origin"];
    const goodAllowed = good.headers["access-control-allow-origin"];
    record(
      "CORS",
      `evil origin: ${evilAllowed ?? "blocked"}; client origin: ${goodAllowed ?? "blocked"}`,
      evilAllowed !== "https://evil.example" &&
        evilAllowed !== "*" &&
        goodAllowed === process.env.CLIENT_URL
        ? "OK"
        : "ISSUE",
    );

    // ---- 8. trust proxy (matters once deployed behind a proxy) ----
    const trust = app.get("trust proxy");
    record(
      "trust proxy setting",
      `${trust} (rate limiter would see the proxy's IP when deployed)`,
      trust ? "OK" : "ISSUE",
    );

    // ---- 9. Refresh cookie flags ----
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: victim.email, password: victim.password });
    const cookie = (login.headers["set-cookie"] ?? [])[0] ?? "";
    record(
      "Refresh cookie flags",
      cookie
        ? [
            /HttpOnly/i.test(cookie) ? "HttpOnly" : "no HttpOnly",
            /SameSite=\w+/i.exec(cookie)?.[0] ?? "no SameSite",
            /Secure/i.test(cookie)
              ? "Secure"
              : "no Secure (normal outside production)",
          ].join(", ")
        : `no cookie (login status ${login.status})`,
      cookie ? (/HttpOnly/i.test(cookie) ? "OK" : "ISSUE") : "CHECK",
    );

    console.log("\nSecurity probe results\n");
    console.table(results);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
