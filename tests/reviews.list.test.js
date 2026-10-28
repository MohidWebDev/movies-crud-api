import request from "supertest";
import app from "../app.js";
import Review from "../models/reviewModel.js";
import { createMovie } from "./helpers/factories.js";

// Insert straight into the collection so every review gets an exact,
// distinct createdAt (Mongoose timestamps would tie within a millisecond)
const insertReviews = (movie, count) =>
  Review.collection.insertMany(
    Array.from({ length: count }, (_, i) => {
      const at = new Date(Date.UTC(2026, 0, 1, 0, 0, i));
      return {
        movie: movie._id,
        reviewerName: `Reviewer ${i}`,
        rating: 1 + (i % 5),
        comment: `Comment ${i}`,
        createdAt: at,
        updatedAt: at,
      };
    }),
  );

const getReviews = (movie) =>
  request(app).get(`/api/movies/${movie._id}/reviews`);

describe("GET /api/movies/:movieId/reviews", () => {
  it("returns an empty list for a movie without reviews", async () => {
    const movie = await createMovie();

    const res = await getReviews(movie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns the fields the frontend relies on", async () => {
    const movie = await createMovie();
    await insertReviews(movie, 1);

    const res = await getReviews(movie);

    expect(res.body[0]).toEqual(
      expect.objectContaining({
        _id: expect.any(String),
        movie: movie._id.toString(),
        reviewerName: "Reviewer 0",
        rating: 1,
        comment: "Comment 0",
        createdAt: expect.any(String),
      }),
    );
  });

  it("only returns reviews of the requested movie", async () => {
    const movie = await createMovie({ title: "Mine" });
    const other = await createMovie({ title: "Other" });
    await insertReviews(movie, 2);
    await insertReviews(other, 3);

    const res = await getReviews(movie);

    expect(res.body).toHaveLength(2);
  });

  it("returns the newest reviews first", async () => {
    const movie = await createMovie();
    await insertReviews(movie, 3);

    const res = await getReviews(movie);

    expect(res.body.map((r) => r.reviewerName)).toEqual([
      "Reviewer 2",
      "Reviewer 1",
      "Reviewer 0",
    ]);
  });

  it("returns at most the 100 newest reviews", async () => {
    const movie = await createMovie();
    await insertReviews(movie, 105);

    const res = await getReviews(movie);

    expect(res.body).toHaveLength(100);
    expect(res.body[0].reviewerName).toBe("Reviewer 104");
    expect(res.body[99].reviewerName).toBe("Reviewer 5");
  });
});
