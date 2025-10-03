import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { apiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';
import { analyticsTrackerMiddleware } from './AnalyticsMiddleware';

interface OriginValidatorCallback {
  (err: Error | null, allow?: boolean): void;
}

const originValidator = (origin: string | undefined, cb: OriginValidatorCallback): void => {
  const allowedOrigins: string[] = ['http://localhost:5403', ...((process.env.ALLOWED_ORIGINS ?? '').split(';').map(s => s.trim()).filter(Boolean))];

  // origin === undefined ocurre en curl, postman, etc. Lo puedes permitir
  if (!origin || !process.env.ALLOWED_ORIGINS || allowedOrigins.includes(origin)) {
    return cb(null, true);
  }
  return cb(null, false);
}

const corsOptions: cors.CorsOptions = {
    origin: originValidator,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
    credentials: true // Allow credentials if needed
  }

const loadGlobalMiddlewares = (app: express.Application) => {
  app.use(express.json({limit: '2mb'}));
  app.use(express.urlencoded({limit: '2mb', extended: true}));
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions)); // maneja todas las preflight

  // Do not force API key auth on OPTIONS requests
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(helmet(
    {
      crossOriginResourcePolicy: false // allows loading of files from /public
    }
  ));
  app.use(express.static('public'));
  
  // Apply API Key authentication middleware to all routes
  // except those defined as public
  app.use(apiKeyAuthMiddleware);

  // Apply analytics tracking middleware
  app.use(analyticsTrackerMiddleware);
};

export default loadGlobalMiddlewares;
