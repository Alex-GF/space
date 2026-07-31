import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Server } from 'http';
import { getApp, shutdownApp, baseUrl } from '../utils/testApp';
import { createTestUser, deleteTestUser } from '../utils/users/userTestUtils';
import container from '../../main/config/container';
import { LeanUser } from '../../main/types/models/User';

/**
 * Telling "your key is wrong" apart from "we could not check your key".
 *
 * Authentication reads the database, so a dropped connection, a replica-set
 * election or a Mongo that is simply not running all surface as an exception in
 * the same place an unknown key does. Answering 401 to those states something
 * untrue about the caller's credential and sends whoever is debugging to look
 * at their API key, which is the one place the problem is not.
 *
 * Both directions are pinned here, because the interesting part of the change
 * is the boundary: a refusal must stay a refusal.
 */
describe('Authentication when the database cannot answer', function () {
  let app: Server;
  let user: LeanUser;

  beforeAll(async function () {
    app = await getApp();
    user = await createTestUser('ADMIN');
  });

  afterAll(async function () {
    await deleteTestUser(user.username);
    vi.restoreAllMocks();
    await shutdownApp();
  });

  it('answers 503, not 401, when the lookup fails', async function () {
    const userService: any = container.resolve('userService');
    const outage = vi
      .spyOn(userService, 'findByApiKey')
      .mockRejectedValue(new Error('MongooseServerSelectionError: connection timed out'));

    try {
      const response = await request(app)
        .get(`${baseUrl}/users`)
        .set('x-api-key', user.apiKey);

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('cannot verify credentials');
    } finally {
      outage.mockRestore();
    }
  });

  it('asks the caller to try again', async function () {
    const userService: any = container.resolve('userService');
    const outage = vi
      .spyOn(userService, 'findByApiKey')
      .mockRejectedValue(new Error('MongooseServerSelectionError: connection timed out'));

    try {
      const response = await request(app)
        .get(`${baseUrl}/users`)
        .set('x-api-key', user.apiKey);

      // A 503 without Retry-After tells a client nothing about whether waiting
      // is worth it.
      expect(response.headers['retry-after']).toBeDefined();
    } finally {
      outage.mockRestore();
    }
  });

  it('still answers 401 to a key that was read and rejected', async function () {
    // The regression this pairs with. `UserService.findByApiKey` reports an
    // unknown key by throwing rather than by returning nothing, so narrowing
    // the catch to a dedicated error type is not by itself enough to keep this
    // a 401.
    const response = await request(app)
      .get(`${baseUrl}/users`)
      .set('x-api-key', 'usr_nosuchkeyatall');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('INVALID DATA: Invalid API Key');
  });

  it('still answers 401 to a key of no recognisable kind', async function () {
    const response = await request(app)
      .get(`${baseUrl}/users`)
      .set('x-api-key', 'not-a-prefixed-key');

    expect(response.status).toBe(401);
  });
});
