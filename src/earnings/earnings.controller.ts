import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import { EarningsService } from "./earnings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Worker Earnings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("earnings")
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @ApiOperation({
    summary: "Get worker earnings summary (gross, commission, net, job counts) filtered by period and date",
  })
  @Get("summary")
  async getSummary(
    @Request() req: any,
    @Query("period") period?: string,
    @Query("date") dateStr?: string,
  ) {
    return this.earningsService.getSummary(req.user.userId, period, dateStr);
  }

  @ApiOperation({
    summary: "Get daily/weekly chart breakdown of worker earnings",
  })
  @Get("breakdown")
  async getBreakdown(@Request() req: any, @Query("period") period?: string) {
    return this.earningsService.getBreakdown(req.user.userId, period);
  }
}
