import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  PayBookingDto,
} from "./dto/booking.dto";
import { BookingStatus } from "../common/enums/booking-status.enum";
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
      const upperStatus = status.toUpperCase() as BookingStatus;
      if (Object.values(BookingStatus).includes(upperStatus)) {
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
    const booking = await this.prisma.booking.findUnique({
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

    const booking = await this.prisma.booking.create({
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
      },
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
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status as BookingStatus,
      },
      include: {
        worker: true,
      },
    });
  }

  async markAsPaid(id: string, dto: PayBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
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
    });
  }
}
