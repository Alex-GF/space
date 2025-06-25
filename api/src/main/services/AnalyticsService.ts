import { startOfToday, format, subDays } from 'date-fns';

import container from '../config/container.js';
import AnalyticsRepository from '../repositories/mongoose/AnalyticsRepository.js';
import CacheService from './CacheService.js';

class AnalyticsService {
  private readonly analyticsRepository: AnalyticsRepository;
  private readonly cacheService: CacheService;
  private readonly expirationTime: number = 24 * 60 * 60; // 24 hours in seconds

  constructor() {
    this.analyticsRepository = container.resolve('analyticsRepository');
    this.cacheService = container.resolve('cacheService');
  }

  async checkDayRollover(isFeatureCall: boolean = false): Promise<void> {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const lastPersistedDate = await this.cacheService.get('analytics.lastPersistedDate') || today;
    const lastApiCalls = await this.cacheService.get('analytics.apiCalls') ?? 0;
    const lastEvaluations = await this.cacheService.get('analytics.evaluations') ?? 0;
    if (today !== lastPersistedDate) {
      // Persist previous day's counters
      await this.analyticsRepository.create({
        date: lastPersistedDate,
        apiCalls: lastApiCalls ?? 0,
        evaluations: lastEvaluations ?? 0,
      });

      // Reset counters
      this.cacheService.set('analytics.lastPersistedDate', today, this.expirationTime, true);
      this.cacheService.set('analytics.apiCalls', 1, this.expirationTime, true);
      this.cacheService.set('analytics.evaluations', 1, this.expirationTime, true);
    }else{
      this.cacheService.set('analytics.apiCalls', lastApiCalls + 1, this.expirationTime, true);
      if (isFeatureCall) {
        this.cacheService.set('analytics.evaluations', lastEvaluations + 1, this.expirationTime, true);
      }
    }
  }

  private async _getWeeklyData(metric: 'apiCalls' | 'evaluations'): Promise<{ labels: string[]; data: number[] }> {
    const analytics = await this.analyticsRepository.findWeeklyAnalytics();

    analytics.push({
      date: format(startOfToday(), 'yyyy-MM-dd'),
      apiCalls: await this.cacheService.get('analytics.apiCalls') ?? 0,
      evaluations: await this.cacheService.get('analytics.evaluations') ?? 0,
    })

    const labels = analytics.map(entry => format(new Date(entry.date), 'EEEE'));
    const data = analytics.map(entry => entry[metric]);
    let i = 1;
    while (labels.length < 7) {
      const lastDate = analytics.length > 0 ? new Date(analytics[analytics.length - 1].date) : new Date();
      const previousDate = subDays(lastDate, i);

      labels.unshift(format(previousDate, 'EEEE').substring(0, 3)); // Get short day name
      data.unshift(0);
      i++;
    }

    return { labels, data };
  }

  async getWeeklyApiCalls(): Promise<{ labels: string[]; data: number[] }> {
    return this._getWeeklyData('apiCalls');
  }

  async getWeeklyEvaluations(): Promise<{ labels: string[]; data: number[] }> {
    return this._getWeeklyData('evaluations');
  }
}

export default AnalyticsService;
