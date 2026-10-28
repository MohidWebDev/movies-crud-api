import { jest } from "@jest/globals";
import request from "supertest";
import User from "../models/userModel.js";

// The real auth limiter allows 20 requests per 15 minutes; this file sends more
const passThrough = (req, res, next) => next();
jest.unstable_mockModule("../middleware/rateLimiter.js", () => ({
  generalLimiter: passThrough,
  authLimiter: passThrough,
}));

const { default: app } = await import("../app.js");

const validRegistration = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "password123",
};

const register = (body) => request(app).post("/api/auth/register").send(body);
const login = (body) => request(app).post("/api/auth/login").send(body);

describe("POST /api/auth/register", () => {
  it("creates a user with a trimmed, lowercased email", async () => {
    const res = await register({
      ...validRegistration,
      email: "  Jane@Example.com  ",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "user",
    });
    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects a duplicate email with 409", async () => {
    await register(validRegistration);

    const res = await register(validRegistration);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already in use");
  });

  it("does not reveal which emails exist through operator injection", async () => {
    await User.create(validRegistration);

    const matchesUser = await register({
      ...validRegistration,
      email: { $regex: "^jane" },
    });
    const matchesNobody = await register({
      ...validRegistration,
      email: { $regex: "^zzz" },
    });

    // Both must be refused in exactly the same way
    expect(matchesUser.status).toBe(matchesNobody.status);
    expect(matchesUser.status).toBe(400);
    expect(matchesUser.body.errors.map((e) => e.msg)).toEqual(
      matchesNobody.body.errors.map((e) => e.msg),
    );
  });

  const invalidCases = [
    ["a missing name", { name: undefined }, "name"],
    ["a whitespace-only name", { name: "   " }, "name"],
    ["a name that is not text", { name: { $gt: "" } }, "name"],
    ["a name over 100 characters", { name: "a".repeat(101) }, "name"],
    ["a missing email", { email: undefined }, "email"],
    ["an email that is not valid", { email: "not-an-email" }, "email"],
    ["an email that is an object", { email: { $regex: ".*" } }, "email"],
    ["a missing password", { password: undefined }, "password"],
    ["a password under 6 characters", { password: "12345" }, "password"],
    ["a password over 72 characters", { password: "a".repeat(73) }, "password"],
    ["a password that is an object", { password: { $ne: "x" } }, "password"],
  ];

  it.each(invalidCases)(
    "rejects %s with 400",
    async (_name, override, field) => {
      const res = await register({ ...validRegistration, ...override });

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.path)).toContain(field);
      expect(await User.countDocuments()).toBe(0);
    },
  );
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await User.create(validRegistration);
  });

  it("logs in with valid credentials and sets an HttpOnly refresh cookie", async () => {
    const res = await login({
      email: validRegistration.email,
      password: validRegistration.password,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.user.email).toBe("jane@example.com");
    expect(res.headers["set-cookie"].join(";")).toMatch(
      /refreshToken=.*HttpOnly/i,
    );
  });

  it("rejects a wrong password with 401", async () => {
    const res = await login({
      email: validRegistration.email,
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("gives the same 401 for an unknown email", async () => {
    const res = await login({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("does not let an operator in place of the email match some user", async () => {
    const res = await login({
      email: { $ne: null },
      password: validRegistration.password,
    });

    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  const invalidLogins = [
    ["a missing email", { email: undefined }],
    ["a missing password", { password: undefined }],
    ["an email that is an array", { email: ["jane@example.com"] }],
    ["a password that is an object", { password: { $ne: "x" } }],
    ["a password over 200 characters", { password: "a".repeat(201) }],
  ];

  it.each(invalidLogins)("rejects %s with 400", async (_name, override) => {
    const res = await login({
      email: validRegistration.email,
      password: validRegistration.password,
      ...override,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
