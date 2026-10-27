import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, urlencoded } from "express";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // --- REVERSE PROXY FOR TURF SERVICE ---
  const turfTargetUrl =
    process.env.TURF_SERVICE_URL ||
    "https://turf-api.gentlerock-8d88694a.centralindia.azurecontainerapps.io";

  // Redirect /turf/docs -> /turf/api/docs
  app.use("/turf/docs", (req, res) => res.redirect("/turf/api/docs"));

  // Proxy Swagger UI static assets & specs for Turf
  app.use(
    "/api/docs",
    createProxyMiddleware({
      target: turfTargetUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,
      },
    }),
  );

  app.use(
    "/turf",
    createProxyMiddleware({
      target: turfTargetUrl,
      changeOrigin: true,
      pathRewrite: {
        "^/turf": "", // Strips '/turf' before forwarding to turf-api
      },
      on: {
        proxyReq: fixRequestBody,
      },
    }),
  );

  const apiPrefix = process.env.API_PREFIX || "api/v1";
  app.setGlobalPrefix(apiPrefix, {
    // Exclude docs, swagger, uploads, and turf from global prefix to avoid 404s
    exclude: [
      "health",
      "docs",
      "docs/(.*)",
      "docs-json",
      "docs-yaml",
      "swagger",
      "swagger/(.*)",
      "api-docs",
      "api-docs/(.*)",
      "api/docs",
      "api/docs/(.*)",
      "uploads",
      "uploads/(.*)",
      "turf",
      "turf/(.*)",
      "",
    ],
  });

  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "*",
  });

  // Ensure uploads directory exists and serve statically
  const uploadsDir = join(process.cwd(), "uploads");
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: "/uploads/",
  });

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger Documentation Setup for ServiGo
  const swaggerConfig = new DocumentBuilder()
    .setTitle("ServiGo API & Worker Platform")
    .setDescription("ServiGo On-Demand Home Services & Worker App API")
    .setVersion("1.1")
    .addBearerAuth()
    .addServer(
      "https://app-service-api-c3hwa9dpeggseyb5.centralindia-01.azurewebsites.net",
      "Production Azure Web App",
    )
    .addServer("/", "Current Host (Relative)")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
    },
    customSiteTitle: "ServiGo API Documentation",
  });

  // Swagger URL aliases to prevent 404 on common typos
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/swagger", (req: any, res: any) => res.redirect("/docs"));
  httpAdapter.get("/api-docs", (req: any, res: any) => res.redirect("/docs"));

  const port = process.env.PORT || 8080;

  await app.listen(port, "0.0.0.0");
  console.log(
    `🚀 ServiGo Backend running on: http://0.0.0.0:${port}/${apiPrefix}`,
  );
  console.log(`⚽ Turf Proxy mapped from /turf to: ${turfTargetUrl}`);
  console.log(`📚 Swagger Documentation: http://0.0.0.0:${port}/docs`);
}

bootstrap();
