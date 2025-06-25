import { Request, Response, NextFunction } from 'express';

import container from '../config/container.js';

export const analyticsTrackerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const baseUrl = process.env.BASE_URL_PATH || '/api/v1';
  const analyticsService = container.resolve('analyticsService');

  // Check if the current route is public (doesn't require authentication)
  const path = req.path.replace(baseUrl, '');
  const isEvaluationRoute = path.startsWith('/features') && req.method === 'POST';

  analyticsService.checkDayRollover(isEvaluationRoute);
  return next();
};
