import mongoose from "mongoose";

describe("test setup", () => {
  it("connects to the in-memory database", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
