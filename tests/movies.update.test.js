import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import Movie from "../models/movieModel.js";
import { createMovie, movieData } from "./helpers/factories.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

let adminToken;
let userToken;

beforeEach(async () => {
  ({ token: adminToken } = await createUserWithToken("admin"));
  ({ token: userToken } = await createUserWithToken("user"));
});

describe("PUT /api/movies/:id", () => {
  it("requires authentication", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .put(`/api/movies/${movie._id}`)
      .send(movieData());

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user and leaves the movie unchanged", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .put(`/api/movies/${movie._id}`)
      .set(authHeader(userToken))
      .send(movieData({ title: "Hacked" }));

    expect(res.status).toBe(403);
    const fresh = await Movie.findById(movie._id);
    expect(fresh.title).toBe("Inception");
  });

  it("replaces the movie's fields for an admin", async () => {
    const movie = await createMovie();
    const update = movieData({
      title: "Interstellar",
      year: 2014,
      genre: ["Sci-Fi", "Drama"],
    });

    const res = await request(app)
      .put(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken))
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Interstellar",
      year: 2014,
      genre: ["Sci-Fi", "Drama"],
    });

    const saved = await Movie.findById(movie._id);
    expect(saved.title).toBe("Interstellar");
    expect(saved.year).toBe(2014);
  });

  it("returns 404 when the movie does not exist", async () => {
    const res = await request(app)
      .put(`/api/movies/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(adminToken))
      .send(movieData());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app)
      .put("/api/movies/not-a-valid-id")
      .set(authHeader(adminToken))
      .send(movieData());

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.path)).toContain("id");
  });

  it("returns 400 for an invalid body and leaves the movie unchanged", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .put(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken))
      .send(movieData({ title: "", year: 1800 }));

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.path)).toEqual(
      expect.arrayContaining(["title", "year"]),
    );
    const fresh = await Movie.findById(movie._id);
    expect(fresh.title).toBe("Inception");
    expect(fresh.year).toBe(2010);
  });
});

describe("PATCH /api/movies/:id", () => {
  it("returns 403 for a non-admin user", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .patch(`/api/movies/${movie._id}`)
      .set(authHeader(userToken))
      .send({ year: 2011 });

    expect(res.status).toBe(403);
    const fresh = await Movie.findById(movie._id);
    expect(fresh.year).toBe(2010);
  });

  it("updates only the fields that were sent", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .patch(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken))
      .send({ year: 2011 });

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2011);
    expect(res.body.title).toBe("Inception");
    expect(res.body.director).toBe("Christopher Nolan");
  });

  it("returns 404 when the movie does not exist", async () => {
    const res = await request(app)
      .patch(`/api/movies/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(adminToken))
      .send({ year: 2011 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app)
      .patch("/api/movies/not-a-valid-id")
      .set(authHeader(adminToken))
      .send({ year: 2011 });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Invalid movie ID");
  });

  it("rejects an invalid value via Mongoose validation", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .patch(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken))
      .send({ year: 1800 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(res.body.message).toContain("Year can't be before");
    const fresh = await Movie.findById(movie._id);
    expect(fresh.year).toBe(2010);
  });
});
