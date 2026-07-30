import express from 'express';
import mongoose from 'mongoose';

/**
 * Mongoose reports 1 when the driver has a usable connection.
 *
 * 2 is "still connecting", which matters at start-up: a container answering
 * "healthy" while it is still dialling is one an orchestrator will start
 * sending traffic to.
 */
const CONNECTED = 1;

const loadFileRoutes = function (app: express.Application) {
  const baseUrl = '/api/v1';

  // Public route for authentication (does not require API Key)
  app.route(`${baseUrl}/healthcheck`).get(async (req: any, res: any) => {
    // The database is not a detail of this service, it is the service: every
    // authenticated route reads it before it can answer anything. A check that
    // proves only the HTTP listener is up reports a Space that cannot serve a
    // single request as healthy, and keeps reporting it indefinitely while
    // every call fails.
    if (mongoose.connection.readyState !== CONNECTED) {
      return res.status(503).json({
        message: 'Service is up but cannot reach its database.',
        database: 'disconnected',
      });
    }

    try {
      // readyState is what the driver believes. A ping is what the database
      // says, and the two disagree when a connection has gone stale.
      await mongoose.connection.db!.admin().ping();
    } catch (error: any) {
      return res.status(503).json({
        message: 'Service is up but its database is not answering.',
        database: 'unreachable',
        details: error?.message ?? String(error),
      });
    }

    res.status(200).json({
      message: 'Service is up and running!',
      database: 'connected',
    });
  });
};

export default loadFileRoutes;
