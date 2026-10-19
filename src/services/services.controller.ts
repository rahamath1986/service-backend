import { Controller, Get, Param, Query } from "@nestjs/common";
import { ServicesService } from "./services.service";

@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async getAllServices(@Query("search") search?: string) {
    return this.servicesService.getAllServices(search);
  }

  @Get("featured")
  async getFeaturedServices() {
    return this.servicesService.getFeaturedServices();
  }

  @Get(":id")
  async getServiceById(@Param("id") id: string) {
    return this.servicesService.getServiceById(id);
  }
}
