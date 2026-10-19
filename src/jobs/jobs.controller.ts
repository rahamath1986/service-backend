import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JobsService } from "./jobs.service";
import {
  RejectJobDto,
  StartJobDto,
  ProgressJobDto,
  MaterialsJobDto,
  AdditionalCostDto,
  CompleteJobDto,
  ReportIssueDto,
} from "./dto/job.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Worker Jobs & Lifecycle")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({
    summary: "Get incoming/pending job requests for worker with expiry timer",
  })
  @Get("incoming")
  async getIncomingJobs(@Request() req: any) {
    return this.jobsService.getIncomingJobs(req.user.userId);
  }

  @ApiOperation({ summary: "Get currently active/ongoing job for worker" })
  @Get("active")
  async getActiveJob(@Request() req: any) {
    return this.jobsService.getActiveJob(req.user.userId);
  }

  @ApiOperation({ summary: "Get worker completed & past jobs history" })
  @Get("history")
  async getJobHistory(@Request() req: any) {
    return this.jobsService.getJobHistory(req.user.userId);
  }

  @ApiOperation({ summary: "Get detailed job information by ID" })
  @Get(":id")
  async getJobById(@Request() req: any, @Param("id") id: string) {
    return this.jobsService.getJobById(id, req.user.userId);
  }

  @ApiOperation({ summary: "Accept incoming job" })
  @Post(":id/accept")
  @HttpCode(HttpStatus.OK)
  async acceptJob(@Request() req: any, @Param("id") id: string) {
    return this.jobsService.acceptJob(id, req.user.userId);
  }

  @ApiOperation({ summary: "Reject/decline incoming job with reason" })
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async rejectJob(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: RejectJobDto,
  ) {
    return this.jobsService.rejectJob(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Update job status to EN_ROUTE" })
  @Post(":id/en-route")
  @HttpCode(HttpStatus.OK)
  async markEnRoute(@Request() req: any, @Param("id") id: string) {
    return this.jobsService.markEnRoute(id, req.user.userId);
  }

  @ApiOperation({ summary: "Update job status to ARRIVED" })
  @Post(":id/arrived")
  @HttpCode(HttpStatus.OK)
  async markArrived(@Request() req: any, @Param("id") id: string) {
    return this.jobsService.markArrived(id, req.user.userId);
  }

  @ApiOperation({ summary: "Verify customer start OTP and begin work" })
  @Post(":id/start")
  @HttpCode(HttpStatus.OK)
  async startJob(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: StartJobDto,
  ) {
    return this.jobsService.startJob(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Update checklist progress items" })
  @Post(":id/progress")
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: ProgressJobDto,
  ) {
    return this.jobsService.updateProgress(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Update spare parts / materials billing" })
  @Post(":id/materials")
  @HttpCode(HttpStatus.OK)
  async updateMaterials(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: MaterialsJobDto,
  ) {
    return this.jobsService.updateMaterials(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Add extra charges / additional cost" })
  @Post(":id/additional-cost")
  @HttpCode(HttpStatus.OK)
  async addAdditionalCost(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: AdditionalCostDto,
  ) {
    return this.jobsService.addAdditionalCost(id, req.user.userId, dto);
  }

  @ApiOperation({
    summary: "Complete job with after photos, signature, and finalize earnings",
  })
  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  async completeJob(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: CompleteJobDto,
  ) {
    return this.jobsService.completeJob(id, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Report dispute or safety issue for a job" })
  @Post(":id/report-issue")
  @HttpCode(HttpStatus.OK)
  async reportIssue(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: ReportIssueDto,
  ) {
    return this.jobsService.reportIssue(id, req.user.userId, dto);
  }
}
