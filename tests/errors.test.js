import { jest } from "@jest/globals";
import request from "supertest";
import multer from "multer";
import app from "../app.js";
import Movie from "../models/movieModel.js";
import errorHandler from "../middleware/errorHandler.js";
import AppError from "../utils/AppError.js";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("errorHandler (unit)", () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("maps a MulterError to 400", () => {
    const res = mockRes();

    errorHandler(new multer.MulterError("LIMIT_FILE_SIZE"), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "File too large",
    });
  });

  it("maps a Mongoose ValidationError to 400 with joined messages", () => {
    const res = mockRes();
    const validationError = new Movie({}).validateSync();

    errorHandler(validationError, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe("fail");
    expect(body.message).toContain("Title is required");
    expect(body.message).toContain("Director is required");
  });

  it("maps a Mongoose CastError to 400", () => {
    const res = mockRes();
    const castError = Object.assign(new Error("cast failed"), {
      name: "CastError",
      path: "_id",
      value: "abc",
    });

    errorHandler(castError, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Invalid _id: abc",
    });
  });

  it("uses the status code and message of an AppError", () => {
    const res = mockRes();

    errorHandler(new AppError("Nope", 403), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ status: "fail", message: "Nope" });
  });

  it("falls back to 500 for an unknown error", () => {
    const res = mockRes();

    errorHandler(new Error("boom"), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: "error", message: "boom" });
  });
});

describe("app-level behaviour (integration)", () => {
  it("returns 404 for an unknown route", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "fail",
      message: "Route /api/does-not-exist not found",
    });
  });

  it("returns 500 when something unexpected breaks", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const findSpy = jest.spyOn(Movie, "find").mockImplementation(() => {
      throw new Error("DB exploded");
    });

    const res = await request(app).get("/api/movies");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: "error", message: "DB exploded" });

    findSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("sets security headers via helmet", async () => {
    const res = await request(app).get("/api/movies");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows CORS for the configured client with credentials", async () => {
    const res = await request(app)
      .get("/api/movies")
      .set("Origin", process.env.CLIENT_URL);

    expect(res.headers["access-control-allow-origin"]).toBe(
      process.env.CLIENT_URL,
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
