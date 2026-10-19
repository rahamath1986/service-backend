import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  getRoot() {
    return {
      name: "ServiGo Backend API",
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
