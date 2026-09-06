import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DesktopModule } from "./modules/desktop/desktop.module";
import { HealthModule } from "./modules/health/health.module";
import { ServersModule } from "./modules/servers/servers.module";
import { SocialModule } from "./modules/social/social.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ".env.production.local",
        ".env.production",
        ".env.development.local",
        ".env.development",
        "../../.env.production.local",
        "../../.env.production",
        "../../.env.development.local",
        "../../.env.development"
      ]
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120
      }
    ]),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    ServersModule,
    SocialModule,
    DesktopModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
