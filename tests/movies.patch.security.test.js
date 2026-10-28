import request from "supertest";
import app from "../app.js";
import Movie from "../models/movieModel.js";
import { createMovie } from "./helpers/factories.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

const ORIGINAL_POSTER = {
  url: "https://res.cloudinary.com/demo/original.jpg",
  publicId: "movie-posters/original",
};
const EVIL_POSTER = {
  url: "https://evil.example/x.png",
  publicId: "movie-posters/not-mine",
};

describe("PATCH /api/movies/:id (field whitelist)", () => {
  let token;
  let movie;

  beforeEach(async () => {
    ({ token } = await createUserWithToken("admin"));
    movie = await createMovie({ poster: ORIGINAL_POSTER });
  });

  const patch = (body) =>
    request(app)
      .patch(`/api/movies/${movie._id}`)
      .set(authHeader(token))
      .send(body);

  it("updates the allowed fields and ignores a poster in the same body", async () => {
    const res = await patch({
      title: "Renamed",
      year: 2012,
      poster: EVIL_POSTER,
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
    expect(res.body.year).toBe(2012);

    const saved = await Movie.findById(movie._id);
    expect(saved.poster.publicId).toBe(ORIGINAL_POSTER.publicId);
    expect(saved.poster.url).toBe(ORIGINAL_POSTER.url);
  });

  it.each([
    ["a nested poster object", { poster: EVIL_POSTER }],
    ["a dotted poster path", { "poster.publicId": EVIL_POSTER.publicId }],
    ["a $set operator", { $set: { "poster.publicId": EVIL_POSTER.publicId } }],
  ])("ignores %s and leaves the poster untouched", async (_name, body) => {
    const res = await patch(body);

    expect(res.status).toBe(200);
    const saved = await Movie.findById(movie._id);
    expect(saved.poster.publicId).toBe(ORIGINAL_POSTER.publicId);
  });

  // Regression: guards the returnDocument change below
  it("returns the updated document, not the old one", async () => {
    const res = await patch({ title: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
  });
});
