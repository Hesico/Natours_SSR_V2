const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  let message = Object.values(err.errors)
    .map((e) => e.message)
    .join('. ');
  return new AppError(message, 400);
};

const handleJsonWebTokenError = () => new AppError('Invalid token!', 401);

const handleTokenExpiredError = () => new AppError('Token Expired!', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('ERROR: ', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    const handleErrorFunctions = {
      name: {
        CastError: handleCastErrorDB,
        ValidationError: handleValidationErrorDB,
        JsonWebTokenError: handleJsonWebTokenError,
        TokenExpiredError: handleTokenExpiredError,
      },
      code: {
        11000: handleDuplicateFieldsDB,
      },
    };

    const erroFunc = handleErrorFunctions.name[err.name] || handleErrorFunctions.code[err.code];
    const error = erroFunc ? erroFunc(err) : err;

    sendErrorProd(error, res);
  }
};
