import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { createMovie } from "./helpers/factories.js";

describe("GET /api/movies", () => {
  it("returns an empty list when there are no movies", async () => {
    const res = await request(app).get("/api/movies");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      page: 1,
      totalPages: 0,
      totalCount: 0,
    });
  });

  it("returns movies with pagination info", async () => {
    await createMovie({ title: "Movie A" });
    await createMovie({ title: "Movie B" });
    await createMovie({ title: "Movie C" });

    const res = await request(app).get("/api/movies?page=1&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toMatchObject({ page: 1, totalPages: 2, totalCount: 3 });
  });

  it("filters movies by genre", async () => {
    await createMovie({ title: "Laugh Riot", genre: ["Comedy"] });
    await createMovie({ title: "Dark Night", genre: ["Horror"] });

    const res = await request(app).get("/api/movies?genre=Comedy");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Laugh Riot");
  });

  it("searches by title, case-insensitively", async () => {
    await createMovie({ title: "Inception" });
    await createMovie({
      title: "Titanic",
      director: "James Cameron",
      year: 1997,
      genre: ["Romance"],
    });

    const res = await request(app).get("/api/movies?search=incep");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Inception");
  });

  it("sorts by year ascending when sort=year", async () => {
    await createMovie({ title: "New", year: 2020 });
    await createMovie({ title: "Old", year: 1990 });

    const res = await request(app).get("/api/movies?sort=year");

    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.title)).toEqual(["Old", "New"]);
  });

  it("rejects invalid query params with 400", async () => {
    const badLimit = await request(app).get("/api/movies?limit=500");
    const badGenre = await request(app).get("/api/movies?genre=Nope");

    expect(badLimit.status).toBe(400);
    expect(badLimit.body.errors).toBeDefined();
    expect(badGenre.status).toBe(400);
  });
});

describe("GET /api/movies/:id", () => {
  it("returns a single movie", async () => {
    const movie = await createMovie();

    const res = await request(app).get(`/api/movies/${movie._id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(movie._id.toString());
    expect(res.body.title).toBe("Inception");
  });

  it("returns 404 when the movie does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/movies/${missingId}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).get("/api/movies/not-a-valid-id");

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Invalid movie ID");
  });
});
