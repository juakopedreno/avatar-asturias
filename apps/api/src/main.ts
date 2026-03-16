import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { config as dotenvConfig } from "dotenv";
import helmet from "helmet";
import { AppModule } from "./app.module";

const rootEnvPath = resolve(__dirname, "../../../.env");
if (existsSync(rootEnvPath)) {
  dotenvConfig({ path: rootEnvPath });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:8080"];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Avatar Torremolinos API")
    .setDescription("API base para backoffice, conversacion y servicios de IA.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
