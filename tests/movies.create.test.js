import request from "supertest";
import app from "../app.js";
import Movie from "../models/movieModel.js";
import { movieData } from "./helpers/factories.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

describe("POST /api/movies", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/movies").send(movieData());

    expect(res.status).toBe(401);
    expect(await Movie.countDocuments()).toBe(0);
  });

  it("creates a movie and saves it to the database", async () => {
    const { token } = await createUserWithToken("user");

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send(movieData());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Inception",
      director: "Christopher Nolan",
      year: 2010,
      genre: ["Sci-Fi", "Thriller"],
    });

    const saved = await Movie.findById(res.body._id);
    expect(saved).not.toBeNull();
    expect(saved.title).toBe("Inception");
  });

  it("trims whitespace from the title", async () => {
    const { token } = await createUserWithToken("user");

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send(movieData({ title: "   Inception   " }));

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Inception");
  });

  it("creates a movie without a trailerUrl", async () => {
    const { token } = await createUserWithToken("user");
    const { trailerUrl, ...body } = movieData();

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.trailerUrl).toBeNull();
  });

  it("ignores fields that are not part of the movie input", async () => {
    const { token } = await createUserWithToken("user");

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send(movieData({ poster: { url: "https://evil.example/x.png" } }));

    expect(res.status).toBe(201);
    expect(res.body.poster?.url).toBeUndefined();
  });

  const invalidCases = [
    ["a missing title", { title: "" }, "title"],
    ["a whitespace-only title", { title: "   " }, "title"],
    ["a missing director", { director: "" }, "director"],
    ["a year before 1888", { year: 1800 }, "year"],
    ["a non-numeric year", { year: "abc" }, "year"],
    ["an empty genre list", { genre: [] }, "genre"],
    ["an unsupported genre", { genre: ["Nonsense"] }, "genre[0]"],
    [
      "a non-YouTube trailer URL",
      { trailerUrl: "https://vimeo.com/123456" },
      "trailerUrl",
    ],
  ];

  it.each(invalidCases)(
    "rejects %s with 400",
    async (_name, override, field) => {
      const { token } = await createUserWithToken("user");

      const res = await request(app)
        .post("/api/movies")
        .set(authHeader(token))
        .send(movieData(override));

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.path)).toContain(field);
      expect(await Movie.countDocuments()).toBe(0);
    },
  );
});
