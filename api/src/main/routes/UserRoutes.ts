import express from 'express';

import UserController from '../controllers/UserController.js';
import * as UserValidation from '../controllers/validation/UserValidation.js';
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware.js';

const loadFileRoutes = function (app: express.Application) {
  const userController = new UserController();
  
  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';

  // Public route for authentication (does not require API Key)
  app
    .route(`${baseUrl}/users/authenticate`)
    .post(
      UserValidation.login, 
      handleValidation, 
      userController.authenticate
    );

  // Protected routes (require API Key and appropriate permissions)
  app
    .route(`${baseUrl}/users`)
    .get(userController.getAll)
    .post(UserValidation.create, handleValidation, userController.create);

  app
    .route(`${baseUrl}/users/:username`)
    .get(userController.getByUsername)
    .put(UserValidation.update, handleValidation, userController.update)
    .delete(userController.destroy);

  app
    .route(`${baseUrl}/users/:username/api-key`)
    .put(userController.regenerateApiKey);

  app
    .route(`${baseUrl}/users/:username/role`)
    .put(
      UserValidation.changeRole,
      handleValidation,
      userController.changeRole
    );
};

export default loadFileRoutes;
