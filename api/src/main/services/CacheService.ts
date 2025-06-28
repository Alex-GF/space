import dotenv from 'dotenv';
import { RedisClientType } from 'redis';
dotenv.config();

class CacheService {
  private redisClient: RedisClientType | null = null;

  constructor() {}

  setRedisClient(client: RedisClientType) {
    this.redisClient = client;
  }

  async get(key: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    const value = await this.redisClient?.get(key.toLowerCase());

    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, expirationInSeconds: number = 300, replaceIfExists: boolean = false) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    const previousValue = await this.redisClient?.get(key.toLowerCase());
    if (previousValue && previousValue !== JSON.stringify(value) && !replaceIfExists) {
      throw new Error('Value already exists in cache, please use a different key.');
    }

    await this.redisClient?.set(key.toLowerCase(), JSON.stringify(value), {
      EX: expirationInSeconds,
    });
  }

  async match(keyLocationPattern: string): Promise<string[]> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Retrieve all keys (note: use with caution on large databases)
    const allKeys = await this.redisClient.keys(keyLocationPattern);

    return allKeys;
  }

  async del(key: string) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    await this.redisClient.del(key.toLowerCase());
  }
}

export default CacheService;
