import app from "../app.js";

describe("TRUST_PROXY default", () => {
  it("does not trust proxy headers unless asked to", () => {
    expect(app.get("trust proxy")).toBe(false);
  });
});
