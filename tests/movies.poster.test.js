import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import { createMovie } from "./helpers/factories.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

const FAKE_URL = "https://res.cloudinary.com/test/image/upload/new-poster.jpg";
const FAKE_ID = "movie-posters/new-poster";

// Fake multer storage engine: no network, just reports a Cloudinary-like result
class FakeCloudinaryStorage {
  _handleFile(req, file, cb) {
    file.stream.on("data", () => {});
    file.stream.on("end", () =>
      cb(null, { path: FAKE_URL, filename: FAKE_ID }),
    );
    file.stream.on("error", cb);
  }
  _removeFile(req, file, cb) {
    cb(null);
  }
}

const destroy = jest.fn();

jest.unstable_mockModule("multer-storage-cloudinary", () => ({
  CloudinaryStorage: FakeCloudinaryStorage,
}));
jest.unstable_mockModule("../config/cloudinary.js", () => ({
  default: { uploader: { destroy } },
}));

const { default: app } = await import("../app.js");

const png = () => Buffer.from("fake-png-bytes");
const attachPng = (req) =>
  req.attach("poster", png(), {
    filename: "poster.png",
    contentType: "image/png",
  });

let token;

beforeEach(async () => {
  destroy.mockReset();
  destroy.mockResolvedValue({ result: "ok" });
  ({ token } = await createUserWithToken("user"));
});

describe("POST /api/movies/:id/poster", () => {
  it("requires authentication", async () => {
    const movie = await createMovie();

    const res = await attachPng(
      request(app).post(`/api/movies/${movie._id}/poster`),
    );

    expect(res.status).toBe(401);
  });

  it("uploads a poster and saves its url and publicId", async () => {
    const movie = await createMovie();

    const res = await attachPng(
      request(app)
        .post(`/api/movies/${movie._id}/poster`)
        .set(authHeader(token)),
    );

    expect(res.status).toBe(200);
    expect(res.body.poster).toMatchObject({ url: FAKE_URL, publicId: FAKE_ID });

    const saved = await Movie.findById(movie._id);
    expect(saved.poster.url).toBe(FAKE_URL);
    expect(saved.poster.publicId).toBe(FAKE_ID);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("deletes the old poster from Cloudinary when replacing it", async () => {
    const movie = await createMovie({
      poster: {
        url: "https://res.cloudinary.com/x/old.jpg",
        publicId: "movie-posters/old",
      },
    });

    const res = await attachPng(
      request(app)
        .post(`/api/movies/${movie._id}/poster`)
        .set(authHeader(token)),
    );

    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalledWith("movie-posters/old");
    expect(res.body.poster.publicId).toBe(FAKE_ID);
  });

  it("returns 400 when no file is attached", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .post(`/api/movies/${movie._id}/poster`)
      .set(authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No file uploaded");
  });

  it("returns 400 for a file type that is not allowed", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .post(`/api/movies/${movie._id}/poster`)
      .set(authHeader(token))
      .attach("poster", Buffer.from("just text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Only JPEG, PNG, and WEBP images are allowed",
    );
  });

  it("returns 400 when the file is larger than 2 MB", async () => {
    const movie = await createMovie();

    const res = await request(app)
      .post(`/api/movies/${movie._id}/poster`)
      .set(authHeader(token))
      .attach("poster", Buffer.alloc(2 * 1024 * 1024 + 1), {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("File too large");
  });

  it("returns 404 when the movie does not exist", async () => {
    const res = await attachPng(
      request(app)
        .post(`/api/movies/${new mongoose.Types.ObjectId()}/poster`)
        .set(authHeader(token)),
    );

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app)
      .post("/api/movies/not-a-valid-id/poster")
      .set(authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.errors[0].msg).toBe("Invalid movie ID");
  });
});
