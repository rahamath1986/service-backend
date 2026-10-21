import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  PayBookingDto,
  ConfirmAdditionalCostDto,
  CancelBookingDto,
} from "./dto/booking.dto";
import { BookingStatus as BookingStatusEnum } from "../common/enums/booking-status.enum";
const BookingStatus: any = BookingStatusEnum;
type BookingStatus = any;
import { AppGateway } from "../gateway/app.gateway";

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  async getBookings(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      let upperStatus = status.trim().toUpperCase();
      if (upperStatus === "INPROGRESS" || status === "inProgress") {
        upperStatus = "IN_PROGRESS";
      }
      if (Object.values(BookingStatus).includes(upperStatus as BookingStatus)) {
        where.status = upperStatus;
      }
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        worker: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getBookingById(id: string, userId?: string) {
    const booking: any = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        worker: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            address: true,
          },
        },
        chatRoom: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // If userId provided, ensure user is either the customer or the assigned worker
    if (
      userId &&
      booking.userId !== userId &&
      booking.worker?.userId !== userId &&
      booking.workerId !== userId
    ) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async createBooking(userId: string, dto: CreateBookingDto) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: dto.workerId },
    });

    if (!worker) {
      throw new NotFoundException("Selected worker was not found");
    }

    const bookingId = `SG${Date.now()}`;
    const startOtp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    const booking: any = await this.prisma.booking.create({
      data: {
        id: bookingId,
        userId,
        workerId: dto.workerId,
        serviceName: dto.serviceName,
        date: dto.date,
        time: dto.time,
        address: dto.address,
        note: dto.note,
        amount: dto.amount,
        status: BookingStatus.REQUESTED,
        paymentMethod: dto.paymentMethod || "UPI (Google Pay)",
        isPaid: false,
        startOtp,
        chatRoom: {
          create: {
            id: `room_${bookingId}`,
          },
        },
      } as any,
      include: {
        worker: true,
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // Real-time dispatch to worker over WebSocket Gateway
    try {
      this.gateway.dispatchJobRequest(dto.workerId, {
        id: booking.id,
        serviceName: booking.serviceName,
        amount: booking.amount,
        date: booking.date,
        time: booking.time,
        address: booking.address,
        note: booking.note,
        customer: booking.user,
        expiresInSeconds: 60,
      });
    } catch {
      // Ignore if socket server is unavailable
    }

    return booking;
  }

  async updateBookingStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking: any = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    let normalizedStatus = (String(dto.status || "")).trim().toUpperCase();
    if (normalizedStatus === "INPROGRESS") {
      normalizedStatus = "IN_PROGRESS";
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: normalizedStatus as BookingStatus,
      },
      include: {
        worker: true,
      },
    } as any);
  }

  async markAsPaid(id: string, dto: PayBookingDto) {
    const booking: any = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        isPaid: true,
        paymentMethod: dto.paymentMethod,
      },
      include: {
        worker: true,
      },
    } as any);
  }

  async confirmAdditionalCost(
    id: string,
    userId: string,
    dto: ConfirmAdditionalCostDto,
  ) {
    const booking: any = await this.prisma.booking.findUnique({
      where: { id },
      include: { worker: true, user: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException(
        "Only the customer of this booking can confirm or decline additional charges",
      );
    }

    const updated: any = await this.prisma.booking.update({
      where: { id },
      data: dto.approved
        ? {
            status: BookingStatus.IN_PROGRESS,
            isAdditionalCostApproved: true,
          }
        : {
            status: BookingStatus.IN_PROGRESS,
            additionalCost: 0.0,
            additionalCostReason: "Declined by customer",
            isAdditionalCostApproved: false,
          },
      include: {
        worker: true,
        user: true,
      },
    } as any);

    return {
      success: true,
      message: dto.approved
        ? "Additional charges approved. Technician can proceed."
        : "Additional charges declined.",
      booking: updated,
    };
  }

  async cancelBooking(id: string, userId: string, dto?: CancelBookingDto) {
    const booking: any = await this.prisma.booking.findUnique({
      where: { id },
      include: { worker: true, user: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (
      booking.userId !== userId &&
      booking.worker?.userId !== userId &&
      booking.workerId !== userId
    ) {
      throw new ForbiddenException("You are not authorized to cancel this booking");
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ForbiddenException("Completed bookings cannot be cancelled");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return {
        success: true,
        message: "Booking is already cancelled",
        booking,
      };
    }

    const cancelReason = dto?.reason || "Cancelled by customer";

    if (booking.isPaid && booking.amount > 0) {
      try {
        await this.prisma.wallet.upsert({
          where: { userId: booking.userId },
          update: { balance: { increment: booking.amount } },
          create: { userId: booking.userId, balance: booking.amount },
        });

        await this.prisma.walletTransaction.create({
          data: {
            wallet: { connect: { userId: booking.userId } },
            amount: booking.amount,
            type: "CREDIT",
            description: `Refund for cancelled booking #${booking.id}`,
            referenceId: booking.id,
          } as any,
        });
      } catch (err) {
        console.error("Cancellation refund error:", err);
      }
    }

    const updated: any = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        declinedReason: cancelReason,
      },
      include: {
        worker: true,
        user: true,
      },
    } as any);

    try {
      this.gateway.server.emit(`booking_${id}_status`, {
        bookingId: id,
        status: BookingStatus.CANCELLED,
        reason: cancelReason,
      });
      this.gateway.server.emit(`worker_${booking.workerId}_jobs`, {
        type: "JOB_CANCELLED",
        bookingId: id,
      });
    } catch (_) {}

    return {
      success: true,
      message: "Booking cancelled successfully",
      booking: updated,
    };
  }
}
