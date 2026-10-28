import request from "supertest";
import app from "../app.js";
import Review from "../models/reviewModel.js";
import { createMovie } from "./helpers/factories.js";

const addReviews = (movie, ratings) =>
  Review.insertMany(
    ratings.map((rating) => ({
      movie: movie._id,
      reviewerName: "Alice",
      rating,
    })),
  );

// A: four 5-star reviews, B: one 5-star review, C: 4, 4, 5, D: no reviews
const seedRatedMovies = async () => {
  const a = await createMovie({ title: "A" });
  const b = await createMovie({ title: "B" });
  const c = await createMovie({ title: "C" });
  await createMovie({ title: "D" });
  await addReviews(a, [5, 5, 5, 5]);
  await addReviews(b, [5]);
  await addReviews(c, [4, 4, 5]);
};

describe("GET /api/movies/stats", () => {
  it("returns an empty list when there are no reviews", async () => {
    await createMovie({ title: "Unreviewed" });

    const res = await request(app).get("/api/movies/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("ranks by weighted rating and skips movies without reviews", async () => {
    await seedRatedMovies();

    const res = await request(app).get("/api/movies/stats");

    expect(res.status).toBe(200);
    // A (four 5-star reviews) beats B (one 5-star review): few reviews
    // pull a movie's score towards the site average
    expect(res.body.map((m) => m.title)).toEqual(["A", "B", "C"]);
  });

  it("returns each movie's rounded average and review count", async () => {
    await seedRatedMovies();

    const res = await request(app).get("/api/movies/stats");

    expect(
      res.body.map(({ title, averageRating, reviewCount }) => ({
        title,
        averageRating,
        reviewCount,
      })),
    ).toEqual([
      { title: "A", averageRating: 5, reviewCount: 4 },
      { title: "B", averageRating: 5, reviewCount: 1 },
      { title: "C", averageRating: 4.3, reviewCount: 3 },
    ]);
  });

  it("includes the movie's id, year and poster", async () => {
    const movie = await createMovie({
      title: "With Poster",
      year: 1999,
      poster: {
        url: "https://res.cloudinary.com/x/poster.jpg",
        publicId: "movie-posters/poster",
      },
    });
    await addReviews(movie, [4]);

    const res = await request(app).get("/api/movies/stats");

    expect(res.body[0]._id).toBe(movie._id.toString());
    expect(res.body[0].year).toBe(1999);
    expect(res.body[0].poster.url).toBe(
      "https://res.cloudinary.com/x/poster.jpg",
    );
  });

  it("does not leak internal fields", async () => {
    await seedRatedMovies();

    const res = await request(app).get("/api/movies/stats");

    for (const item of res.body) {
      expect(item).not.toHaveProperty("reviews");
      expect(item).not.toHaveProperty("movie");
      expect(item).not.toHaveProperty("weightedRating");
      expect(item).not.toHaveProperty("siteAverageRating");
    }
  });

  it("returns at most 15 movies", async () => {
    for (let i = 0; i < 17; i++) {
      const movie = await createMovie({ title: `Movie ${i}` });
      await addReviews(movie, [4]);
    }

    const res = await request(app).get("/api/movies/stats");

    expect(res.body).toHaveLength(15);
  });
});
