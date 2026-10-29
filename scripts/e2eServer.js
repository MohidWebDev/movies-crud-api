import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = Number(process.env.E2E_PORT) || 3100;
const CLIENT_URL = process.env.E2E_CLIENT_URL || "http://localhost:5174";

// Fake config: this server never reads your real .env
process.env.JWT_SECRET = "e2e-access-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.CLIENT_URL = CLIENT_URL;

// Import the app AFTER the env vars are set
const { default: app } = await import("../app.js");
const { default: User } = await import("../models/userModel.js");
const { default: Movie } = await import("../models/movieModel.js");

// The E2E tests log in with these accounts
export const ADMIN = { email: "admin@example.com", password: "password123" };
export const REGULAR_USER = {
  email: "user@example.com",
  password: "password123",
};

const MOVIES = [
  {
    title: "Inception",
    director: "Christopher Nolan",
    year: 2010,
    genre: ["Sci-Fi", "Thriller"],
  },
  {
    title: "Interstellar",
    director: "Christopher Nolan",
    year: 2014,
    genre: ["Sci-Fi", "Adventure"],
  },
  {
    title: "Heat",
    director: "Michael Mann",
    year: 1995,
    genre: ["Crime", "Thriller"],
  },
  {
    title: "The Matrix",
    director: "The Wachowskis",
    year: 1999,
    genre: ["Sci-Fi", "Action"],
  },
  {
    title: "Alien",
    director: "Ridley Scott",
    year: 1979,
    genre: ["Horror", "Sci-Fi"],
  },
  {
    title: "Toy Story",
    director: "John Lasseter",
    year: 1995,
    genre: ["Animation", "Family"],
  },
];

const seed = async () => {
  await User.create({ name: "Admin", ...ADMIN, role: "admin" });
  await User.create({ name: "Regular User", ...REGULAR_USER, role: "user" });
  await Movie.insertMany(MOVIES);
};

const main = async () => {
  console.log(
    "Starting in-memory MongoDB for E2E (your real database is not touched)...",
  );
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Movie.init();
  await User.init();
  await seed();

  const server = app.listen(PORT, () => {
    console.log(`E2E API ready on http://localhost:${PORT}`);
    console.log(`Admin login: ${ADMIN.email} / ${ADMIN.password}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
