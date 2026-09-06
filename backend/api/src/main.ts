import "reflect-metadata";
import compression from "compression";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = Number(config.get<string>("PORT") ?? 4000);
  const corsOrigin = config.get<string>("CORS_ORIGIN");

  if (!corsOrigin) {
    throw new Error("CORS_ORIGIN is required.");
  }

  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  app.useBodyParser("json", { limit: "75mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "75mb" });
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"]
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
