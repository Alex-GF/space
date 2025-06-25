import { body } from 'express-validator';

const expectedConsumptionSingleFeature = [
  body()
    .isObject()
    .withMessage('Body must be an object')
    .custom((body) => {
      return Object.values(body).every(value => typeof value === 'number');
    })
    .withMessage('All values must be numbers')
];

export { expectedConsumptionSingleFeature };
