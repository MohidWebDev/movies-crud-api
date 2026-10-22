import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import Review from "../models/reviewModel.js";
import { createMovie } from "./helpers/factories.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

// Mock Cloudinary BEFORE the app (and the controller that imports it) loads
const destroy = jest.fn();
jest.unstable_mockModule("../config/cloudinary.js", () => ({
  default: { uploader: { destroy } },
}));

const { default: app } = await import("../app.js");

let adminToken;
let userToken;

beforeEach(async () => {
  destroy.mockReset();
  destroy.mockResolvedValue({ result: "ok" });
  ({ token: adminToken } = await createUserWithToken("admin"));
  ({ token: userToken } = await createUserWithToken("user"));
});

describe("DELETE /api/movies/:id", () => {
  it("requires authentication", async () => {
    const movie = await createMovie();

    const res = await request(app).delete(`/api/movies/${movie._id}`);

    expect(res.status).toBe(401);
    expect(await Movie.countDocuments()).toBe(1);
  });

  it("returns 403 for a non-admin user and keeps the movie", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(userToken));

    expect(res.status).toBe(403);
    expect(await Movie.countDocuments()).toBe(1);
  });

  it("deletes the movie for an admin and returns 204", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(await Movie.findById(movie._id)).toBeNull();
  });

  it("deletes the movie's reviews but not other movies' reviews", async () => {
    const movie = await createMovie({ title: "To Delete" });
    const other = await createMovie({ title: "To Keep" });
    await Review.create({ movie: movie._id, reviewerName: "Alice", rating: 5 });
    await Review.create({ movie: movie._id, reviewerName: "Bob", rating: 3 });
    await Review.create({ movie: other._id, reviewerName: "Carol", rating: 4 });

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(204);
    expect(await Review.countDocuments({ movie: movie._id })).toBe(0);
    expect(await Review.countDocuments({ movie: other._id })).toBe(1);
  });

  it("destroys the poster on Cloudinary when the movie has one", async () => {
    const movie = await createMovie({
      poster: {
        url: "https://res.cloudinary.com/x/poster.jpg",
        publicId: "posters/abc123",
      },
    });

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(204);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledWith("posters/abc123");
  });

  it("does not call Cloudinary when the movie has no poster", async () => {
    const movie = await createMovie();

    await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken));

    expect(destroy).not.toHaveBeenCalled();
  });

  it("still returns 204 if Cloudinary fails to delete the poster", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    destroy.mockRejectedValue(new Error("Cloudinary down"));
    const movie = await createMovie({
      poster: {
        url: "https://res.cloudinary.com/x/poster.jpg",
        publicId: "posters/abc123",
      },
    });

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(204);
    expect(await Movie.findById(movie._id)).toBeNull();
    errorSpy.mockRestore();
  });

  it("returns 404 when the movie does not exist", async () => {
    const res = await request(app)
      .delete(`/api/movies/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app)
      .delete("/api/movies/not-a-valid-id")
      .set(authHeader(adminToken));

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Invalid movie ID");
  });
});
