import type { Server } from 'node:http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import { baseUrl, getApp, shutdownApp } from './utils/testApp.js';
import {
  createTestUser,
  deleteTestUser,
} from './utils/users/userTestUtils.js';
import { USER_ROLES } from '../main/types/models/User.js';
import { createRandomContract } from './utils/contracts/contracts.js';

describe('User API Test Suite', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    // Create an admin user for tests
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;
  });

  afterAll(async function () {
    // Clean up the created admin user
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    await shutdownApp();
  });

  describe('Authentication and API Keys', function () {
    it('Should authenticate a user and return their information', async function () {
      const response = await request(app).post(`${baseUrl}/users/authenticate`).send({
        username: adminUser.username,
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).toBe(adminApiKey);
    });

    it('Should regenerate an API Key for a user', async function () {
      const oldApiKey = adminUser.apiKey;
      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/api-key`)
        .set('x-api-key', oldApiKey);

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).not.toBe(oldApiKey);

      // Update the API Key for future tests
      adminApiKey = response.body.apiKey;
      // Update the user in the database
      const updatedUser = (await request(app).get(`${baseUrl}/users/${adminUser.username}`).set('x-api-key', adminApiKey)).body;
      adminUser = updatedUser;
    });
  });

  describe('User Management', function () {
    let testUser: any;

    afterEach(async function () {
      if (testUser?.username) {
        await deleteTestUser(testUser.username);
        testUser = null;
      }
    });

    it('Should create a new user', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[USER_ROLES.length - 1],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', adminApiKey)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.apiKey).toBeDefined();

      testUser = response.body;
    });

    it('Should NOT create admin user', async function () {
      const creatorData = await createTestUser('MANAGER');
      
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Not enough permissions: Only admins can create other admins.");
    });

    it('Should get all users', async function () {
      const response = await request(app).get(`${baseUrl}/users`).set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should get a user by username', async function () {
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const response = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
    });

    it('Should update a user', async function () {
      testUser = await createTestUser('MANAGER');

      const updatedData = {
        username: `updated_${Date.now()}`, // Use timestamp to ensure uniqueness
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(updatedData.username);

      // Update the test user
      testUser = response.body;
    });

    it('Should NOT update user to admin', async function () {
      const creatorData = await createTestUser('MANAGER');
      const testAdmin = await createTestUser('ADMIN');
      
      const userData = {
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testAdmin.username}`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Not enough permissions: Only admins can change roles to admin.");
    });

    it('Should NOT update user to admin', async function () {
      const creatorData = await createTestUser('MANAGER');
      const testAdmin = await createTestUser('ADMIN');
      
      const userData = {
        username: `updated_${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testAdmin.username}`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Not enough permissions: Only admins can update admin users.");
    });

    it("Should change a user's role", async function () {
      // First create a test user
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const newRole = 'MANAGER';
      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: newRole });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.role).toBe(newRole);

      // Update the test user
      testUser = response.body;
    });

    it("Should NOT change an admin's role", async function () {
      const creatorData = await createTestUser('MANAGER');
      const adminUser = await createTestUser(USER_ROLES[0]);

      const newRole = 'MANAGER';

      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/role`)
        .set('x-api-key', creatorData.apiKey)
        .send({ role: newRole });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Not enough permissions: Only admins can update admin users.");
    });

    it("Should NOT change a user's role to ADMIN", async function () {
      const creatorData = await createTestUser('MANAGER');
      const evaluatorUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const newRole = 'ADMIN';

      const response = await request(app)
        .put(`${baseUrl}/users/${evaluatorUser.username}/role`)
        .set('x-api-key', creatorData.apiKey)
        .send({ role: newRole });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Not enough permissions: Only admins can assign the role ADMIN.");
    });

    it('Should delete a user', async function () {
      // First create a test user
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const response = await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(204);

      // Try to get the deleted user
      const getResponse = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(getResponse.status).toBe(404);

      // To avoid double cleanup
      testUser = null;
    });
  });

  describe('Role-based Access Control', function () {
    let evaluatorUser: any;
    let managerUser: any;

    beforeEach(async function () {
      // Create users with different roles
      evaluatorUser = await createTestUser('EVALUATOR');
      managerUser = await createTestUser('MANAGER');
    });

    afterEach(async function () {
      // Clean up created users
      if (evaluatorUser?.username) await deleteTestUser(evaluatorUser.username);
      if (managerUser?.username) await deleteTestUser(managerUser.username);
    });

    describe('EVALUATOR Role', function () {
      it('EVALUATOR user should be able to access GET /services endpoint', async function () {
        const getServicesResponse = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', evaluatorUser.apiKey);

        expect(getServicesResponse.status).toBe(200);
      });

      it('EVALUATOR user should be able to access GET /features endpoint', async function () {
        const getFeaturesResponse = await request(app)
          .get(`${baseUrl}/features`)
          .set('x-api-key', evaluatorUser.apiKey);

        expect(getFeaturesResponse.status).toBe(200);
      });

      it('EVALUATOR user should NOT be able to access GET /users endpoint', async function () {
        const getUsersResponse = await request(app)
          .get(`${baseUrl}/users`)
          .set('x-api-key', evaluatorUser.apiKey);

        expect(getUsersResponse.status).toBe(403);
      });

      it('EVALUATOR user should be able to use POST operations on /features endpoint', async function () {
        const newContract = await createRandomContract(app);

        const postFeaturesResponse = await request(app)
          .post(`${baseUrl}/features/${newContract.userContact.userId}`)
          .set('x-api-key', evaluatorUser.apiKey);

        expect(postFeaturesResponse.status).toBe(200);
      });

      it('EVALUATOR user should NOT be able to use POST operations on /users endpoint', async function () {
        const postUsersResponse = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', evaluatorUser.apiKey)
          .send({
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[USER_ROLES.length - 1],
          });

        expect(postUsersResponse.status).toBe(403);
      });

      it('EVALUATOR user should NOT be able to use PUT operations on /users endpoint', async function () {
        const putUsersResponse = await request(app)
          .put(`${baseUrl}/users/${evaluatorUser.username}`)
          .set('x-api-key', evaluatorUser.apiKey)
          .send({
        username: `updated_${Date.now()}`,
          });

        expect(putUsersResponse.status).toBe(403);
      });

      it('EVALUATOR user should NOT be able to use DELETE operations on /users endpoint', async function () {
        const deleteUsersResponse = await request(app)
          .delete(`${baseUrl}/users/${evaluatorUser.username}`)
          .set('x-api-key', evaluatorUser.apiKey);
        
        expect(deleteUsersResponse.status).toBe(403);
      });
    });

    describe('MANAGER Role', function () {
      it('MANAGER user should be able to access GET /services endpoint', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', managerUser.apiKey);

        expect(response.status).toBe(200);
      });

      it('MANAGER user should be able to access GET /users endpoint', async function () {
        const response = await request(app)
          .get(`${baseUrl}/users`)
          .set('x-api-key', managerUser.apiKey);

        expect(response.status).toBe(200);
      });

      it('MANAGER user should be able to use POST operations on /users endpoint', async function () {
        const userData = {
          username: `test_user_${Date.now()}`,
          password: 'password123',
          role: USER_ROLES[USER_ROLES.length - 1],
        }

        const response = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', managerUser.apiKey)
          .send(userData);

        expect(response.status).toBe(201);
      });

      it('MANAGER user should NOT be able to create ADMIN users', async function () {
        const userData = {
          username: `test_user_${Date.now()}`,
          password: 'password123',
          role: USER_ROLES[0], // ADMIN role
        }

        const response = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', managerUser.apiKey)
          .send(userData);

        expect(response.status).toBe(403);
      });

      it('MANAGER user should be able to use PUT operations on /users endpoint', async function () {
        // First create a service to update
        const userData = {
          username: `test_user_${Date.now()}`,
          password: 'password123',
          role: USER_ROLES[USER_ROLES.length - 1],
        }
        
        const createResponse = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', adminApiKey)
          .send(userData);
          
        const username = createResponse.body.username;
        
        // Test update operation
        const updateData = {
          username: `updated_${Date.now()}`,
        };
        
        const response = await request(app)
          .put(`${baseUrl}/users/${username}`)
          .set('x-api-key', managerUser.apiKey)
          .send(updateData);
          
        expect(response.status).toBe(200);
      });

      it('MANAGER user should NOT be able to use DELETE operations', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/1234`)
          .set('x-api-key', managerUser.apiKey);

        expect(response.status).toBe(403);
      });
    })

    describe('ADMIN Role', function () {
      it('ADMIN user should have GET access to user endpoints', async function () {
        const getResponse = await request(app).get(`${baseUrl}/users`).set('x-api-key', adminApiKey);
        expect(getResponse.status).toBe(200);
      });

      it('ADMIN user should have POST access to create users', async function () {
        const userData = {
          username: `new_user_${Date.now()}`,
          password: 'password123',
          role: USER_ROLES[USER_ROLES.length - 1],
        };
        
        const postResponse = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', adminApiKey)
          .send(userData);
          
        expect(postResponse.status).toBe(201);
        
        // Clean up
        await request(app)
          .delete(`${baseUrl}/users/${postResponse.body.username}`)
          .set('x-api-key', adminApiKey);
      });

      it('ADMIN user should have DELETE access to remove users', async function () {
        // First create a user to delete
        const userData = {
          username: `delete_user_${Date.now()}`,
          password: 'password123',
          role: USER_ROLES[USER_ROLES.length - 1],
        };
        
        const createResponse = await request(app)
          .post(`${baseUrl}/users`)
          .set('x-api-key', adminApiKey)
          .send(userData);
          
        // Then test deletion
        const deleteResponse = await request(app)
          .delete(`${baseUrl}/users/${createResponse.body.username}`)
          .set('x-api-key', adminApiKey);
          
        expect(deleteResponse.status).toBe(204);
      });
    })
  });
});
