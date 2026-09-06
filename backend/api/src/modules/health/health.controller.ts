import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
  dependencies: {
    database: "ok" | "error";
    redis: "ok" | "error" | "disabled";
  };
}

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const database = await this.checkDatabase();
    const redis = this.redis.configured ? await this.redis.ping() : false;

    return {
      status: "ok",
      service: "tempest-light-api",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: database ? "ok" : "error",
        redis: this.redis.configured ? (redis ? "ok" : "error") : "disabled"
      }
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
