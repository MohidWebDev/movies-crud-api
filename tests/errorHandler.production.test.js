import { jest } from "@jest/globals";
import errorHandler from "../middleware/errorHandler.js";
import AppError from "../utils/AppError.js";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("errorHandler in production", () => {
  const originalEnv = process.env.NODE_ENV;
  let errorSpy;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    errorSpy.mockRestore();
  });

  it("hides the message of an unexpected error", () => {
    const res = mockRes();

    errorHandler(
      new Error("connection to 10.0.0.5:27017 refused"),
      {},
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Something went wrong",
    });
  });

  it("still logs the real error on the server", () => {
    const res = mockRes();

    errorHandler(
      new Error("connection to 10.0.0.5:27017 refused"),
      {},
      res,
      jest.fn(),
    );

    expect(errorSpy).toHaveBeenCalled();
  });

  it("keeps the message of an intentional AppError", () => {
    const res = mockRes();

    errorHandler(new AppError("Movie not found", 404), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Movie not found",
    });
  });

  it("keeps the message of a client error that is not an AppError", () => {
    const res = mockRes();
    const parseError = Object.assign(new Error("Unexpected token } in JSON"), {
      statusCode: 400,
    });

    errorHandler(parseError, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe(
      "Unexpected token } in JSON",
    );
  });
});
