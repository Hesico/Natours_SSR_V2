const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have a review'],
      minlength: [10, 'A review must have more or equal then 10 characters'],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must between 1 and 5'],
      max: [5, 'Rating must between 1 and 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate review
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  //   .populate({
  //     path: 'tour',
  //     select: 'name',
  //   });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats?.[0]?.nRating || 0,
    ratingsAverage: stats?.[0]?.avgRating || 4.5
  });
}

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
})

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
})

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) await this.r.constructor.calcAverageRatings(this.r.tour);
})

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
