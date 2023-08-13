const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError('There are no document with this Id', 404));
    }

    res.status(204).json({
      status: 'sucess',
      data: null,
    });
  });
};

exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) return next(new AppError('There are no Document with this Id', 404));

    res.status(200).json({
      status: 'sucess',
      data: {
        data: doc,
      },
    });
  });
};

exports.createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'sucess',
      data: {
        data: doc,
      },
    });
  });
};

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) return next(new AppError('There are no Document with this Id', 404));

    return res.status(200).json({
      status: 'sucess',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.find();

    if (populateOptions) query = query.populate(populateOptions);

    const features = new APIFeatures(query, req.query);
    features.filter().sort().select().paginate();

    const docs = await features.query;

    res.status(200).json({
      status: 'sucess',
      requestAt: req.requestTime,
      result: docs.length,
      data: {
        data: docs,
      },
    });
  });
