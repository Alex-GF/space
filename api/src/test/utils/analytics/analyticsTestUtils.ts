import { subDays } from 'date-fns';

import AnalyticsDayMongoose from '../../../main/repositories/mongoose/models/AnalyticsDayMongoose.js';
import type { LeanAnalytics } from '../../../main/types/models/Analytics.js';

// Create a test user directly in the database
export const createTestAnalytics = async (): Promise<LeanAnalytics[]> => {
  const analytics = [
    {
      date: subDays(new Date(), 3).toISOString().split('T')[0],
      apiCalls: 180,
      evaluations: 130
    },
    {
      date: subDays(new Date(), 2).toISOString().split('T')[0],
      apiCalls: 220,
      evaluations: 140
    },
    {
      date: subDays(new Date(), 1).toISOString().split('T')[0],
      apiCalls: 250,
      evaluations: 160
    }
  ];

  // Create user directly in the database
  for (const entry of analytics) {
    const analyticsEntry = new AnalyticsDayMongoose(entry);
    await analyticsEntry.save();
  }
  
  return analytics;
};