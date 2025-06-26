import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { apiKeyAuthMiddleware } from './ApiKeyAuthMiddleware.js';
import { analyticsTrackerMiddleware } from './AnalyticsMiddleware.js';

const loadGlobalMiddlewares = (app: express.Application) => {
  app.use(express.json());
  app.use(cors({
    origin: process.env.ENVIRONMENT === "development" ? '*' : "http://localhost:5403", // Allow all origins, adjust as necessary for your security needs
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
    allowedHeaders: ['Content-Type', 'x-api-key'], // Specify allowed headers
    credentials: true // Allow credentials if needed
  }));
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

  // Apply analytics tracking middleware
  app.use(analyticsTrackerMiddleware);
};

export default loadGlobalMiddlewares;
