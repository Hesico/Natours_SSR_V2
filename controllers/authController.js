const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = async (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'sucess',
    token,
    data: {
      user,
    },
  });
};

exports.singup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });

  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Email or Password is missing!', 400));

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Usuário ou senha incorreto!', 401));

  createAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req?.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('Your are not logged in!', 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const _user = await User.findById(decoded.id);

  if (!_user)
    return next(new AppError('The user belonging to this token does no longer exist!', 401));

  if (_user.changedPasswordAfter(decoded.iat))
    return next(new AppError('User recently changed password!', 401));

  req.user = _user;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    const ableRoles = [...roles];
    if (ableRoles.includes(req.user.role)) return next();

    next(new AppError('You do not have permission to perform this action!', 403));
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return next(new AppError('There is no user with this email!', 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot you password? Submit a patch request whit your new password and passwordConfirm to: ${resetURL}
  \nIf you din't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'sucess',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, newPassword, passwordConfirm } = req.body;

  if (!password || !newPassword)
    return next(new AppError('Please send the password and the new password!', 400));

  const user = await User.findOne({ _id: req.user._id }).select('+password');

  const isPasswordCorrect = await user.correctPassword(password, user.password);

  if (!isPasswordCorrect) return next(new AppError('The password is not correct!', 401));

  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createAndSendToken(user, 200, res);
});


exports.isLoggedIn = catchAsync(async (req, res, next) => {

  if (req?.cookies?.jwt && req.cookies.jwt !== 'loggedout') {
    const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
    const _user = await User.findById(decoded.id);

    if (!_user) return next();
    if (_user.changedPasswordAfter(decoded.iat)) return next();

    res.locals.user = _user;
    return next();
  }

  next();
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' })
});