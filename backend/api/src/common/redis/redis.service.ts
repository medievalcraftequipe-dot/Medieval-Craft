import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>("REDIS_URL");

    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not configured. Redis-backed features are disabled.");
      return;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis connection issue: ${error.message}`);
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.warn(`Redis unavailable during startup: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client || this.client.status === "end") {
      return false;
    }

    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  get connection(): Redis | null {
    return this.client;
  }

  get configured(): boolean {
    return !!this.config.get<string>("REDIS_URL");
  }
}
