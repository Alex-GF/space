import type { LeanAnalytics } from '../../types/models/Analytics.js';
import { toPlainObject } from '../../utils/mongoose.js';
import RepositoryBase from '../RepositoryBase.js';
import AnalyticsDayMongoose from './models/AnalyticsDayMongoose.js';

class AnalyticsRepository extends RepositoryBase {

  async findWeeklyAnalytics() {
    const weeklyApiCalls = await AnalyticsDayMongoose.aggregate([
      {
        $group: {
          _id: '$date',
          apiCalls: { $sum: '$apiCalls' },
          evaluations: { $sum: '$evaluations' },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $limit: 6, // Get the last 6 days (the current day will be recovered from memory)
      },
      {
        $project: {
          date: '$_id',
          apiCalls: 1,
          evaluations: 1,
          _id: 0,
        },
      },
    ]);
    
    return weeklyApiCalls.map(entry => toPlainObject<LeanAnalytics>(entry));
  }

  async create(data: { date: string; apiCalls: number; evaluations: number }) {

    const newAnalyticsEntry = await AnalyticsDayMongoose.create(data);

    return toPlainObject<LeanAnalytics>(newAnalyticsEntry.toObject());
  }

}

export default AnalyticsRepository;
