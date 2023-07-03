const express = require('express');
const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  uploadTourImages,
  resizeTourImages,
} = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

// router.param('id', checkID);

router.route('/top-5-cheap').get(aliasTopTours, getAllTours);

router.route('/tour-stats').get(getTourStats);

router.route('/monthly-plan/:year').get(getMonthlyPlan);

router
  .route('/')
  .get(authController.protect, getAllTours)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), createTour);

router
  .route('/:id')
  .get(getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), deleteTour);

module.exports = router;
