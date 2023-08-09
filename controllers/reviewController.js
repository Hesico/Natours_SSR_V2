const Review = require('../models/reviewModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Review.find(), req.query);
  features.filter().sort().select().paginate();

  const reviews = await features.query;

  res.status(200).json({
    status: 'sucess',
    requestAt: req.requestTime,
    result: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.createReview = catchAsync(async (req, res, next) => {
  req.body.user = req.user._id;
  const newReview = await Review.create(req.body);

  res.status(201).json({
    status: 'sucess',
    data: {
      review: newReview,
    },
  });
});
