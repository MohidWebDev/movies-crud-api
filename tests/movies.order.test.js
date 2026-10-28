import request from "supertest";
import app from "../app.js";
import { createMovie } from "./helpers/factories.js";

const titlesOnPage = async (query) => {
  const res = await request(app).get("/api/movies").query(query);
  return res.body.data.map((movie) => movie.title);
};

describe("GET /api/movies ordering", () => {
  it("lists movies in creation order by default, across pages", async () => {
    for (const title of ["A", "B", "C", "D", "E"]) {
      await createMovie({ title });
    }

    expect(await titlesOnPage({ limit: 2, page: 1 })).toEqual(["A", "B"]);
    expect(await titlesOnPage({ limit: 2, page: 2 })).toEqual(["C", "D"]);
    expect(await titlesOnPage({ limit: 2, page: 3 })).toEqual(["E"]);
  });

  it("breaks year ties by creation order, so pages never repeat or skip a movie", async () => {
    await createMovie({ title: "A", year: 2001 });
    await createMovie({ title: "B", year: 2000 });
    await createMovie({ title: "C", year: 2001 });
    await createMovie({ title: "D", year: 2000 });
    await createMovie({ title: "E", year: 2002 });

    const query = { sort: "year", limit: 2 };

    expect(await titlesOnPage({ ...query, page: 1 })).toEqual(["B", "D"]);
    expect(await titlesOnPage({ ...query, page: 2 })).toEqual(["A", "C"]);
    expect(await titlesOnPage({ ...query, page: 3 })).toEqual(["E"]);
  });
});
