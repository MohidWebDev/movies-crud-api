import multer from "multer";

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ status: "fail", message: err.message });
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
