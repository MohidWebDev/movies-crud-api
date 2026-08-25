import multer from "multer";

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ status: "fail", message: err.message });
  }

  // Handle Mongoose schema validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ status: "fail", message: messages.join(", ") });
  }

  // Handle Mongoose invalid ObjectId (CastError)
  if (err.name === "CastError") {
    return res
      .status(400)
      .json({ status: "fail", message: `Invalid ${err.path}: ${err.value}` });
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.error(err.stack);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || "Something went wrong",
  });
};

export default errorHandler;
