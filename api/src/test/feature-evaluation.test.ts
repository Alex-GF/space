import type { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, subDays, subMilliseconds } from 'date-fns';
import { jwtVerify } from 'jose';

import { baseUrl, getApp, shutdownApp } from './utils/testApp.js';
import type { LeanFeature } from '../main/types/models/FeatureEvaluation.js';
import type { LeanService } from '../main/types/models/Service.js';
import { encryptJWTSecret } from '../main/utils/jwt.js';
import type { LeanContract } from '../main/types/models/Contract.js';
import { cleanupAuthResources, getTestAdminApiKey, getTestAdminUser } from './utils/auth.js';

function isActivePricing(pricingVersion: string, service: LeanService): boolean {
  return Object.keys(service.activePricings).some(
    (activePricingVersion: string) => activePricingVersion === pricingVersion
  );
}

function isArchivedPricing(pricingVersion: string, service: LeanService): boolean {
  return Object.keys(service.archivedPricings).some(
    (archivedPricingVersion: string) => archivedPricingVersion === pricingVersion
  );
}

const DETAILED_EVALUATION_EXPECTED_RESULT = {
  'petclinic-pets': {
    eval: true,
    used: {
      'petclinic-maxPets': 0,
    },
    limit: {
      'petclinic-maxPets': 6,
    },
    error: null,
  },
  'petclinic-visits': {
    eval: true,
    used: {
      'petclinic-maxVisits': 0,
    },
    limit: {
      'petclinic-maxVisits': 9,
    },
    error: null,
  },
  'petclinic-calendar': { 
    eval: true, 
    used: {
      'petclinic-calendarEventsCreationLimit': 0,
    }, 
    limit: {
      'petclinic-calendarEventsCreationLimit': 15,  
    }, 
    error: null 
  },
  'petclinic-vetSelection': { eval: true, used: null, limit: null, error: null },
  'petclinic-consultations': { eval: false, used: null, limit: null, error: null },
  'petclinic-petsDashboard': { eval: false, used: null, limit: null, error: null },
  'petclinic-lowSupportPriority': { eval: true, used: null, limit: null, error: null },
  'petclinic-mediumSupportPriority': { eval: true, used: null, limit: null, error: null },
  'petclinic-highSupportPriority': { eval: false, used: null, limit: null, error: null },
  'petclinic-slaCoverage': { eval: true, used: null, limit: null, error: null },
  'petclinic-petAdoptionCentre': { eval: true, used: null, limit: null, error: null },
  'petclinic-smartClinicReports': { eval: false, used: null, limit: null, error: null },
};

describe('Features API Test Suite', function () {
  let app: Server;
  let adminApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    await getTestAdminUser();
    adminApiKey = await getTestAdminApiKey();
  });

  afterAll(async function () {
    await cleanupAuthResources();
    await shutdownApp();
  });

  let petclinicService: any;

  async function createTestContract(userId = uuidv4()) {
    const contractData = {
      userContact: {
        userId,
        username: 'tUser',
      },
      billingPeriod: {
        autoRenew: true,
        renewalDays: 365,
      },
      contractedServices: {
        [petclinicService.name]: Object.keys(petclinicService.activePricings)[0],
      },
      subscriptionPlans: {
        [petclinicService.name]: 'GOLD',
      },
      subscriptionAddOns: {
        [petclinicService.name]: {
          petAdoptionCentre: 1,
          extraPets: 2,
          extraVisits: 6,
        },
      },
    };

    const createContractResponse = await request(app)
      .post(`${baseUrl}/contracts`)
      .set('x-api-key', adminApiKey)
      .send(contractData);

    return createContractResponse.body;
  }

  // Custom describe for evaluation testing
  const evaluationDescribe = (name: string, fn: () => void) => {
    describe(name, () => {
      fn();
      beforeAll(async function () {
        const createServiceResponse = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', adminApiKey)
          .attach('pricing', 'src/test/data/pricings/petclinic-2025.yml');

        if (createServiceResponse.status === 201) {
          petclinicService = createServiceResponse.body;
        }
      });
    });
  };

  describe('GET /features', function () {
    it('Should return 200 and the features', async function () {
      const response = await request(app)
        .get(`${baseUrl}/features?show=all`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should filter features by featureName', async function () {
      const featureName = 'meetings';
      const response = await request(app)
        .get(`${baseUrl}/features?featureName=${featureName}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(
        response.body.some((feature: LeanFeature) => feature.info.name === featureName)
      ).toBeTruthy();
    });

    it('Should filter features by serviceName', async function () {
      const serviceName = 'zoom';
      const response = await request(app)
        .get(`${baseUrl}/features?serviceName=${serviceName}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(
        response.body.every(
          (feature: LeanFeature) => feature.service.toLowerCase() === serviceName.toLowerCase()
        )
      ).toBeTruthy();
    });

    it('Should filter features by pricingVersion', async function () {
      const pricingVersion = '2.0.0';
      const response = await request(app)
        .get(`${baseUrl}/features?pricingVersion=${pricingVersion}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(
        response.body.every((feature: LeanFeature) => feature.pricingVersion === pricingVersion)
      ).toBeTruthy();
    });

    it('Should paginate results using page parameter', async function () {
      const page = 1;
      const limit = 5;
      const response = await request(app)
        .get(`${baseUrl}/features?page=${page}&limit=${limit}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('Should paginate results using offset parameter', async function () {
      const offset = 2;
      const limit = 5;
      const response = await request(app)
        .get(`${baseUrl}/features?offset=${offset}&limit=${limit}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('Should sort results by featureName in ascending order', async function () {
      const response = await request(app)
        .get(`${baseUrl}/features?sort=featureName&order=asc`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();

      // Check if sorted correctly
      const sortedFeatures = [...response.body].sort((a, b) =>
        a.info.name.localeCompare(b.info.name)
      );
      expect(response.body).toEqual(sortedFeatures);
    });

    it('Should sort results by serviceName in descending order', async function () {
      const response = await request(app)
        .get(`${baseUrl}/features?sort=serviceName&order=desc`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();

      // Check if sorted correctly
      const sortedFeatures = [...response.body].sort((a, b) => b.service.localeCompare(a.service));
      expect(response.body).toEqual(sortedFeatures);
    });

    it('Should show only active features by default', async function () {
      const response = await request(app).get(`${baseUrl}/features`).set('x-api-key', adminApiKey);
      const responseServices = await request(app).get(`${baseUrl}/services`).set('x-api-key', adminApiKey);

      const services = responseServices.body;

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      // For each feature, check that its pricing version is active for its corresponding service
      expect(
        response.body.every((feature: LeanFeature) => {
          const service = services.find((s: LeanService) => s.name === feature.service);
          return service && isActivePricing(feature.pricingVersion, service);
        })
      ).toBeTruthy();
    });

    it('Should show only archived features when specified', async function () {
      const response = await request(app).get(`${baseUrl}/features?show=archived`).set('x-api-key', adminApiKey);
      const responseServices = await request(app).get(`${baseUrl}/services`).set('x-api-key', adminApiKey);

      const services = responseServices.body;

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(
        response.body.every((feature: LeanFeature) => {
          const service = services.find((s: LeanService) => s.name === feature.service);
          return service && isArchivedPricing(feature.pricingVersion, service);
        })
      ).toBeTruthy();
    });

    it('Should combine multiple query parameters correctly', async function () {
      const serviceName = 'zoom';
      const limit = 5;
      const sort = 'featureName';

      const response = await request(app)
        .get(`${baseUrl}/features?serviceName=${serviceName}&limit=${limit}&sort=${sort}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeLessThanOrEqual(limit);
      expect(
        response.body.every(
          (feature: LeanFeature) => feature.service.toLowerCase() === serviceName.toLowerCase()
        )
      ).toBeTruthy();

      // Check if sorted correctly
      const sortedFeatures = [...response.body].sort((a, b) =>
        a.info.name.localeCompare(b.info.name)
      );
      expect(response.body).toEqual(sortedFeatures);
    });

    it('Should handle invalid query parameters gracefully', async function () {
      const response = await request(app)
        .get(`${baseUrl}/features?invalidParam=value`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  evaluationDescribe('POST /features/:userId', function () {
    it('Should return 200 and the evaluation for a user', async function () {
      const newContract = await createTestContract();

      const response = await request(app)
        .post(`${baseUrl}/features/${newContract.userContact.userId}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        'petclinic-pets': true,
        'petclinic-visits': true,
        'petclinic-calendar': true,
        'petclinic-vetSelection': true,
        'petclinic-consultations': false,
        'petclinic-petsDashboard': false,
        'petclinic-lowSupportPriority': true,
        'petclinic-mediumSupportPriority': true,
        'petclinic-highSupportPriority': false,
        'petclinic-slaCoverage': true,
        'petclinic-petAdoptionCentre': true,
        'petclinic-smartClinicReports': false,
      });
    });

    it('Should return 200 and visits as false since its limit has been reached', async function () {
      const testUserId = uuidv4();
      await createTestContract(testUserId);

      // Reach the limit of 9 visits
      await request(app)
        .put(`${baseUrl}/contracts/${testUserId}/usageLevels`)
        .set('x-api-key', adminApiKey)
        .send({
          [petclinicService.name.toLowerCase()]: {
            maxVisits: 9,
          },
        });

      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body['petclinic-visits']).toBeFalsy();
    });

    it('Given expired user subscription but with autoRenew = true should return 200', async function () {
      const testUserId = uuidv4();
      await createTestContract(testUserId);

      // Expire user subscription
      await request(app)
        .put(`${baseUrl}/contracts/${testUserId}/billingPeriod`)
        .set('x-api-key', adminApiKey)
        .send({
          endDate: subDays(new Date(), 1),
          autoRenew: true,
        });

      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(Object.keys(response.body).length).toBeGreaterThan(0);

      const userContract = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(new Date(userContract.billingPeriod.endDate).getFullYear()).toBe(
        new Date().getFullYear() + 1
      ); // + 1 year because the test contract is set to renew 1 year
    });

    it('Given expired user subscription with autoRenew = false should return 400', async function () {
      const testUserId = uuidv4();
      await createTestContract(testUserId);

      // Expire user subscription
      await request(app)
        .put(`${baseUrl}/contracts/${testUserId}/billingPeriod`)
        .set('x-api-key', adminApiKey)
        .send({
          endDate: subMilliseconds(new Date(), 1),
          autoRenew: false,
        });

      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(400);
      expect(response.body.error).toEqual(
        'Invalid subscription: Your susbcription has expired and it is not set to renew automatically. To continue accessing the features, please purchase any subscription.'
      );
    });

    it('Should return 200 and a detailed evaluation for a user', async function () {
      const newContract = await createTestContract();

      const response = await request(app)
        .post(`${baseUrl}/features/${newContract.userContact.userId}?details=true`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(DETAILED_EVALUATION_EXPECTED_RESULT);
    });
  });

  evaluationDescribe('POST /features/:userId/pricing-token', function () {
    it('Should return 200 and the evaluation for a user', async function () {
      const userId = uuidv4();
      const newContract = await createTestContract(userId);

      const response = await request(app)
        .post(`${baseUrl}/features/${userId}/pricing-token`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body.pricingToken).toBeDefined();

      const token = response.body.pricingToken;

      const { payload, protectedHeader } = await jwtVerify(
        token,
        encryptJWTSecret(process.env.JWT_SECRET!),
        {
          algorithms: ['HS256'], // It is important to specify the algorithm used to sign the JWT
        }
      );

      expect(protectedHeader).toBeDefined();
      expect(protectedHeader.alg).toEqual('HS256');
      expect(payload).toBeDefined();
      expect(payload.features).toEqual(DETAILED_EVALUATION_EXPECTED_RESULT);
      expect(payload.sub).toBeDefined();
      expect(payload.sub).toEqual(newContract.userContact.userId);
      expect(payload.pricingContext).toBeDefined();
      expect(payload.subscriptionContext).toBeDefined();
    });
  });

  evaluationDescribe('POST /features/:userId/:featureId', function () {
    let testUserId: string;
    let testFeatureId: string;
    let testUsageLimitId: string;

    beforeEach(async function () {
      const newContract: LeanContract = await createTestContract();
      const testServiceName = Object.keys(newContract.usageLevels)[0].toLowerCase();
      const testFeatureName = 'visits';
      const testUsageLimitName = 'maxVisits';
      testUserId = newContract.userContact.userId;
      testFeatureId = `${testServiceName}-${testFeatureName}`;
      testUsageLimitId = `${testServiceName}-${testUsageLimitName}`;
    });

    it('Should return 200 and the feature evaluation', async function () {
      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}/${testFeatureId}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        used: {
          [testUsageLimitId]: 0,
        },
        limit: {
          [testUsageLimitId]: 9,
        },
        eval: true,
        error: null,
      });
    });

    it('Should return 200: Given expected consumption', async function () {
      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}/${testFeatureId}`)
        .set('x-api-key', adminApiKey)
        .send({
          [testUsageLimitId]: 1,
        });

      
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        used: {
          [testUsageLimitId]: 1,
        },
        limit: {
          [testUsageLimitId]: 9,
        },
        eval: true,
        error: null,
      });

      const contractAfter = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(contractAfter.usageLevels).toBeDefined();

      const usageLevelService = testUsageLimitId.split('-')[0];
      const usageLevelName = testUsageLimitId.split('-')[1];

      expect(contractAfter.usageLevels[usageLevelService][usageLevelName]).toBeDefined();
      expect(contractAfter.usageLevels[usageLevelService][usageLevelName].consumed).toEqual(1);
    });

    it('Should return 200: Given expired renewable usage level', async function () {
      
      const serviceName = testUsageLimitId.split('-')[0];
      const usageLevelName = testUsageLimitId.split('-')[1];

      await request(app)
        .put(`${baseUrl}/contracts/${testUserId}/usageLevels`)
        .set('x-api-key', adminApiKey)
        .send({
          [serviceName]: {
            [usageLevelName]: 4,
          }});

      const contractBefore = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(contractBefore.usageLevels).toBeDefined();
      expect(contractBefore.usageLevels[serviceName]).toBeDefined();
      expect(contractBefore.usageLevels[serviceName][usageLevelName]).toBeDefined();
      expect(contractBefore.usageLevels[serviceName][usageLevelName].consumed).toEqual(4);

      vi.useFakeTimers();
      vi.setSystemTime(addMonths(new Date(), 2)); // Enough to expire the renewable usage level
      
      // Mock de CacheService
      vi.mock('../main/services/CacheService', () => {
        return {
          default: class MockCacheService {
            get = vi.fn().mockResolvedValue(null);
            set = vi.fn().mockResolvedValue(undefined);
            match = vi.fn().mockResolvedValue([]);
            setRedisClient = vi.fn();
          }
        };
      });

      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}/${testFeatureId}`)
        .set('x-api-key', adminApiKey)
        .send({
          [testUsageLimitId]: 1,
        });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        used: {
          [testUsageLimitId]: 1,
        },
        limit: {
          [testUsageLimitId]: 9,
        },
        eval: true,
        error: null,
      });

      const contractAfter = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(contractAfter.usageLevels).toBeDefined();
      expect(contractAfter.usageLevels[serviceName][usageLevelName]).toBeDefined();
      expect(contractAfter.usageLevels[serviceName][usageLevelName].consumed).toEqual(1);

      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('Should return 200: Given expired renewable usage levels should reset all and evaluate one', async function () {
      
      const serviceName = testUsageLimitId.split('-')[0];
      const usageLevelName = testUsageLimitId.split('-')[1];

      await request(app)
        .put(`${baseUrl}/contracts/${testUserId}/usageLevels`)
        .set('x-api-key', adminApiKey)
        .send({
          [serviceName]: {
            [usageLevelName]: 4,
            calendarEventsCreationLimit: 10
          }});

      const contractBefore = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(contractBefore.usageLevels).toBeDefined();
      expect(contractBefore.usageLevels[serviceName]).toBeDefined();
      expect(contractBefore.usageLevels[serviceName][usageLevelName]).toBeDefined();
      expect(contractBefore.usageLevels[serviceName][usageLevelName].consumed).toEqual(4);

      vi.useFakeTimers();
      vi.setSystemTime(addMonths(new Date(), 2)); // Enough to expire the renewable usage level
      
      // Mock de CacheService
      vi.mock('../main/services/CacheService', () => {
        return {
          default: class MockCacheService {
            get = vi.fn().mockResolvedValue(null);
            set = vi.fn().mockResolvedValue(undefined);
            match = vi.fn().mockResolvedValue([]);
            setRedisClient = vi.fn();
          }
        };
      });

      const response = await request(app)
        .post(`${baseUrl}/features/${testUserId}/${testFeatureId}`)
        .set('x-api-key', adminApiKey)
        .send({
          [testUsageLimitId]: 1,
        });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        used: {
          [testUsageLimitId]: 1,
        },
        limit: {
          [testUsageLimitId]: 9,
        },
        eval: true,
        error: null,
      });

      const contractAfter = (await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)).body;
      expect(contractAfter.usageLevels).toBeDefined();
      expect(contractAfter.usageLevels[serviceName][usageLevelName]).toBeDefined();
      expect(contractAfter.usageLevels[serviceName][usageLevelName].consumed).toEqual(1);
      expect(contractAfter.usageLevels[serviceName].calendarEventsCreationLimit).toBeDefined();
      expect(contractAfter.usageLevels[serviceName].calendarEventsCreationLimit.consumed).toEqual(0);

      vi.useRealTimers();
      vi.clearAllMocks();
    });
  });
});