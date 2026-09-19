const multer = require("multer");

const errorMiddleware = (err, req, res, next) => {
  console.error(err.message);

  let statusCode = err.statusCode || 500;
  let message = statusCode >= 500 ? "Server error" : err.message;
  let code = statusCode >= 500 ? "SERVER_ERROR" : err.code || "REQUEST_ERROR";

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    code = "INVALID_ID";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Invalid data";
    code = "VALIDATION_ERROR";
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "A record with those values already exists";
    code = "DUPLICATE_RESOURCE";
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 3 MB)" : "Image upload failed";
    code = "VALIDATION_ERROR";
  } else if (err.message === "Only image files are allowed") {
    statusCode = 400;
    message = err.message;
    code = "VALIDATION_ERROR";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: { code },
  });
};

module.exports = errorMiddleware;
