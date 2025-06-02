import express from 'express';

import ServiceController from '../controllers/ServiceController';
import * as ServiceValidator from '../controllers/validation/ServiceValidation';
import * as PricingValidator from '../controllers/validation/PricingValidation';
import { handlePricingUpload } from '../middlewares/FileHandlerMiddleware';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware';

const loadFileRoutes = function (app: express.Application) {
  const serviceController = new ServiceController();
  const upload = handlePricingUpload(['pricing'], './public/static/pricings/uploaded');

  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  app
    .route(baseUrl + '/services')
    .get(serviceController.index)
    .post(upload, serviceController.create)
    .delete(serviceController.prune);
  
  app
    .route(baseUrl + '/services/:serviceName')
    .get(serviceController.show)
    .put(ServiceValidator.update, handleValidation, serviceController.update)
    .delete(serviceController.disable);

  app
    .route(baseUrl + '/services/:serviceName/pricings')
    .get(serviceController.indexPricings)
    .post(upload, serviceController.addPricingToService);

  app
    .route(baseUrl + '/services/:serviceName/pricings/:pricingVersion')
    .get(serviceController.showPricing)
    .put(PricingValidator.updateAvailability, handleValidation, serviceController.updatePricingAvailability)
    .delete(serviceController.destroyPricing);
};

export default loadFileRoutes;
