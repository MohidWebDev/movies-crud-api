import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/userModel.js";
import { createUserWithToken, authHeader } from "./helpers/auth.js";

describe("protect middleware", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).post("/api/movies").send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, no token");
  });

  it("rejects a malformed token", async () => {
    const res = await request(app)
      .post("/api/movies")
      .set(authHeader("garbage"))
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, invalid token");
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { user } = await createUserWithToken("user");
    const forged = jwt.sign({ userId: user._id }, "wrong-secret");

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(forged))
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, invalid token");
  });

  it("rejects an expired token", async () => {
    const { user } = await createUserWithToken("user");
    const expired = jwt.sign(
      { userId: user._id, exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET,
    );

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(expired))
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token expired");
  });

  it("rejects a token whose user no longer exists", async () => {
    const { user, token } = await createUserWithToken("user");
    await User.deleteOne({ _id: user._id });

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, user not found");
  });

  it("lets a valid token through to the validators", async () => {
    const { token } = await createUserWithToken("user");

    const res = await request(app)
      .post("/api/movies")
      .set(authHeader(token))
      .send({});

    // 400 (validation), not 401, proves protect let the request pass
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe("authorize middleware", () => {
  it("returns 403 when a normal user hits an admin-only route", async () => {
    const { token } = await createUserWithToken("user");
    const id = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/movies/${id}`)
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden: insufficient permissions");
  });

  it("lets an admin through", async () => {
    const { token } = await createUserWithToken("admin");
    const id = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/movies/${id}`)
      .set(authHeader(token));

    // 404 (movie not found) proves the admin got past protect + authorize
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Movie not found");
  });
});
