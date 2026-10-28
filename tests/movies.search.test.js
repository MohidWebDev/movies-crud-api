import request from "supertest";
import app from "../app.js";
import { createMovie } from "./helpers/factories.js";

describe("GET /api/movies?search= (input handling)", () => {
  // None of these characters appear in the seeded movie, so a literal
  // search for any of them must return an empty list, not an error
  // and not "match everything".
  it.each(["[", "(", ")", "*", "+", "?", "\\", "{", "^", "$", "|"])(
    "treats %s as plain text",
    async (character) => {
      await createMovie({ title: "Inception" });

      const res = await request(app)
        .get("/api/movies")
        .query({ search: character });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    },
  );

  it("matches a dot literally instead of as 'any character'", async () => {
    await createMovie({
      title: "Alien",
      director: "Ridley Scott",
      year: 1979,
      genre: ["Sci-Fi"],
    });
    await createMovie({
      title: "A.I.",
      director: "Steven Spielberg",
      year: 2001,
      genre: ["Sci-Fi"],
    });

    const res = await request(app).get("/api/movies").query({ search: "." });

    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.title)).toEqual(["A.I."]);
  });

  it("rejects a search longer than 100 characters with 400", async () => {
    const res = await request(app)
      .get("/api/movies")
      .query({ search: "a".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.path)).toContain("search");
  });

  it("rejects a repeated search parameter with 400", async () => {
    const res = await request(app).get("/api/movies?search=a&search=b");

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.path)).toContain("search");
  });

  // Regression tests: these must pass before AND after the fix
  it("still finds movies by year", async () => {
    await createMovie({ title: "Heat", year: 1995 });
    await createMovie({ title: "Alien", year: 1979 });

    const res = await request(app).get("/api/movies").query({ search: "1995" });

    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.title)).toEqual(["Heat"]);
  });

  it("treats a whitespace-only search as no search", async () => {
    await createMovie({ title: "Heat" });
    await createMovie({ title: "Alien" });

    const res = await request(app).get("/api/movies").query({ search: "   " });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});
