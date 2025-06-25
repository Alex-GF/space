import type { Request, Response, NextFunction } from 'express';

import { authenticateApiKey, hasPermission } from './AuthMiddleware.js';

// Public routes that won't require authentication
const PUBLIC_ROUTES = [
  '/users/authenticate',
  '/healthcheck'
];

/**
 * Middleware that applies authentication and permission verification to all routes
 * except those specified as public
 */
export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';
  
  // Check if the current route is public (doesn't require authentication)
  const path = req.path.replace(baseUrl, '');
  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route));
  
  if (isPublicRoute) {
    return next();
  }
  
  // Apply authentication and permission verification
  authenticateApiKey(req, res, (err?: any) => {
    if (err) return next(err);
    hasPermission(req, res, next);
  });
};
