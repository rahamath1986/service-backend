import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SupportService } from "./support.service";
import { CreateTicketDto, EmergencyAlertDto } from "./dto/support.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Support & Safety")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({ summary: "Get worker/user support tickets" })
  @Get("tickets")
  async getTickets(@Request() req: any) {
    return this.supportService.getTickets(req.user.userId);
  }

  @ApiOperation({ summary: "Create a support ticket" })
  @Post("tickets")
  async createTicket(@Request() req: any, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.userId, dto);
  }

  @ApiOperation({
    summary:
      "Emergency SOS Alert - Broadcasts GPS coordinates during safety incidents",
  })
  @Post("emergency-alert")
  @HttpCode(HttpStatus.OK)
  async emergencyAlert(@Request() req: any, @Body() dto: EmergencyAlertDto) {
    return this.supportService.triggerEmergencyAlert(req.user.userId, dto);
  }
}
