const sendResponse = (res, statusCode, message, data = null, error = null) => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  };

  if (error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

module.exports = sendResponse;
