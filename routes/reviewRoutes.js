const express = require('express');
const { getAllReviews, createReview } = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getAllReviews)
  .post(authController.protect, authController.restrictTo('user', 'admin'), createReview);

module.exports = router;