import { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { baseUrl, getApp, shutdownApp } from './utils/testApp.js';
import {
  createTestUser,
  deleteTestUser,
} from './utils/users/userTestUtils.js';
import type { LeanAnalytics } from '../main/types/models/Analytics.js';
import { createTestAnalytics } from './utils/analytics/analyticsTestUtils.js';

describe('Analytics API Test Suite', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;
  let previousDaysAnalytics: LeanAnalytics[];

  beforeAll(async function () {
    app = await getApp();
    // Create an admin user for tests
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;
    previousDaysAnalytics = await createTestAnalytics();
  });

  afterAll(async function () {
    // Clean up the created admin user
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    await shutdownApp();
  });

  describe('GET /analytics/api-calls', function (){
    it('should return API calls stats', async function () {
      const response = await request(app)
        .get(`${baseUrl}/analytics/api-calls`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('labels');
      expect(response.body).toHaveProperty('data');
      expect(response.body.labels.length).toBe(7);
      expect(response.body.data.length).toBe(7);
      expect(response.body.data[response.body.data.length - 2]).toBe(previousDaysAnalytics[previousDaysAnalytics.length - 1].apiCalls);
      for (let i = 0; i < 3; i++) {
        expect(response.body.data[i]).toBe(0);
      }
    });
    it('should return API evaluations stats', async function () {
      const response = await request(app)
        .get(`${baseUrl}/analytics/evaluations`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('labels');
      expect(response.body).toHaveProperty('data');
      expect(response.body.labels.length).toBe(7);
      expect(response.body.data.length).toBe(7);
      expect(response.body.data[response.body.data.length - 2]).toBe(previousDaysAnalytics[previousDaysAnalytics.length - 1].evaluations);
      for (let i = 0; i < 3; i++) {
        expect(response.body.data[i]).toBe(0);
      }
    });
  })
});
