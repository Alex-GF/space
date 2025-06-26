import { Request, Response } from 'express';
import AnalyticsService from '../services/AnalyticsService.js';
import container from '../config/container.js';

class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = container.resolve('analyticsService');
    this.getApiCallsStats = this.getApiCallsStats.bind(this);
    this.getEvaluationsStats = this.getEvaluationsStats.bind(this);
  }

  async getApiCallsStats(req: Request, res: Response) {
  const stats = await this.analyticsService.getWeeklyApiCalls();
  // Translate labels to Spanish short day names
  const dayMap: Record<string, string> = {
    Mon: 'Lun', Tue: 'Mar', Wed: 'Mié', Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb', Sun: 'Dom',
  };
  stats.labels = stats.labels.map(l => dayMap[l] || l);
  res.json(stats);
}

async getEvaluationsStats(req: Request, res: Response) {
  const stats = await this.analyticsService.getWeeklyEvaluations();
  const dayMap: Record<string, string> = {
    Mon: 'Lun', Tue: 'Mar', Wed: 'Mié', Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb', Sun: 'Dom',
  };
  stats.labels = stats.labels.map(l => dayMap[l] || l);
  res.json(stats);
}

}

export default AnalyticsController;