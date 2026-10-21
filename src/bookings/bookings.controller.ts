import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { BookingsService } from "./bookings.service";
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  PayBookingDto,
  ConfirmAdditionalCostDto,
  CancelBookingDto,
} from "./dto/booking.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBookings(@Request() req: any, @Query("status") status?: string) {
    return this.bookingsService.getBookings(req.user.userId, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getBookingById(@Request() req: any, @Param("id") id: string) {
    return this.bookingsService.getBookingById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createBooking(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/status")
  async updateBookingStatus(
    @Param("id") id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/pay")
  async markAsPaid(@Param("id") id: string, @Body() dto: PayBookingDto) {
    return this.bookingsService.markAsPaid(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/confirm-additional-cost")
  async confirmAdditionalCostPost(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: ConfirmAdditionalCostDto,
  ) {
    return this.bookingsService.confirmAdditionalCost(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/confirm-additional-cost")
  async confirmAdditionalCostPatch(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: ConfirmAdditionalCostDto,
  ) {
    return this.bookingsService.confirmAdditionalCost(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/cancel")
  async cancelBookingPost(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/cancel")
  async cancelBookingPatch(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, req.user.userId, dto);
  }
}
