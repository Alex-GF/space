import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { apiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';

const loadGlobalMiddlewares = (app: express.Application) => {
  app.use(express.json());
  app.use(cors());
  app.use(helmet(
    {
      crossOriginResourcePolicy: false // allows loading of files from /public
    }
  ));
  app.use(express.static('public'));
  app.use(express.json({limit: '2mb'}));
  app.use(express.urlencoded({limit: '2mb', extended: true}));
  
  // Apply API Key authentication middleware to all routes
  // except those defined as public
  app.use(apiKeyAuthMiddleware);
};

export default loadGlobalMiddlewares;
