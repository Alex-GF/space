import dotenv from 'dotenv';
import { SignJWT } from 'jose';
import { pbkdf2Sync } from 'crypto';

import type { DetailedFeatureEvaluation, PricingContext, SubscriptionContext } from '../types/models/FeatureEvaluation.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SALT = process.env.JWT_SALT; // Will be used to generate a secure JWT secret from the one configured
const JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '1h'; // Time in duration format (e.g., "1h", "2d", "3m")

async function generateTokenFromEvalResult(
  userId: string,
  pricingContext: PricingContext,
  subscriptionContext: SubscriptionContext,
  evalResult: DetailedFeatureEvaluation
): Promise<string> {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined!');
  }

  if (!JWT_SALT) {
    throw new Error('JWT_SALT environment variable is not defined!');
  }

  const tokenSub = userId;

  const payload = {
    features: evalResult,
    pricingContext: pricingContext,
    subscriptionContext: subscriptionContext
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt() // Automatically sets the 'iat' claim
    .setExpirationTime(JWT_EXPIRATION) // Sets the 'exp' claim
    .setSubject(tokenSub) // Sets the 'sub' claim
    .sign(encryptJWTSecret(JWT_SECRET));

  return token;
}

function encryptJWTSecret(secret: string): Buffer {
  return pbkdf2Sync(secret, JWT_SALT!, 100_000, 32, 'sha256');
}

export { generateTokenFromEvalResult, encryptJWTSecret };
