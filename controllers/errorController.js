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

const sendErrorDev = (err, res, req) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, res, req) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      console.error('ERROR: ', err);

      return res.status(500).json({
        status: 'error',
        message: 'Something went very wrong',
      });
    }
  } else {
    return res.status(err.isOperational ? err.statusCode : 500).render('error', {
      title: 'Something went wrong!',
      msg: err.isOperational ? err.message : 'Please try again later! Error: ',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res, req);
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

    sendErrorProd(error, res, req);
  }
};
