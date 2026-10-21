import { Controller, Get, Param, Query } from "@nestjs/common";
import { WorkersService } from "./workers.service";

@Controller("workers")
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async getWorkers(
    @Query("serviceName") serviceName?: string,
    @Query("service") service?: string,
    @Query("category") category?: string,
    @Query("categoryName") categoryName?: string,
    @Query("profession") profession?: string,
    @Query("filter") filter?: string,
  ) {
    const resolved = serviceName || service || category || categoryName || profession;
    return this.workersService.getWorkers(resolved, filter);
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
