// Must be set before the app is imported
process.env.TRUST_PROXY = "1";
const { default: app } = await import("../app.js");

describe("TRUST_PROXY", () => {
  it("makes the app trust one proxy hop when it is set", () => {
    expect(app.get("trust proxy")).toBe(1);
  });
});
