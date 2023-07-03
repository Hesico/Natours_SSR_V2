class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (filter) => `$${filter}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    const sortBy = this.queryString.sort ? this.queryString.sort.replace(/,/g, ' ') : '-createdAt';

    this.query = this.query.sort(sortBy);

    return this;
  }

  select() {
    const fieldsToShow = this.queryString.fields
      ? this.queryString.fields.replace(/,/g, ' ')
      : '-__v';

    this.query = this.query.select(fieldsToShow);

    return this;
  }

  paginate() {
    const limit = +this.queryString.limit || 100;
    const page = +this.queryString.page || 1;
    const skip = limit * (page - 1);

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
