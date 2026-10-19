import { Controller, Get, Param, Query } from "@nestjs/common";
import { WorkersService } from "./workers.service";

@Controller("workers")
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async getWorkers(
    @Query("serviceName") serviceName?: string,
    @Query("filter") filter?: string,
  ) {
    return this.workersService.getWorkers(serviceName, filter);
  }

  @Get(":id")
  async getWorkerById(@Param("id") id: string) {
    return this.workersService.getWorkerById(id);
  }

  @Get(":id/reviews")
  async getWorkerReviews(@Param("id") id: string) {
    return this.workersService.getWorkerReviews(id);
  }
}
