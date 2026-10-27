import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookingStatus as BookingStatusEnum } from "../common/enums/booking-status.enum";
const BookingStatus: any = BookingStatusEnum;

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWorkerByUserId(userId: string) {
    let worker = await this.prisma.worker.findUnique({
      where: { userId },
    });
    if (!worker) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        worker = await this.prisma.worker.findFirst({
          where: { phone: user.phone },
        });
      }
    }
    if (!worker) {
      worker = await this.prisma.worker.findFirst();
    }
    if (!worker) {
      throw new NotFoundException("Worker profile not found for this user");
    }
    return worker;
  }

  async getSummary(userId: string, period = "daily", dateStr?: string) {
    const worker = await this.getWorkerByUserId(userId);

    const allCompletedBookings: any = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: BookingStatus.COMPLETED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;

    // Period date window
    let periodStart: Date;
    let periodEnd: Date;

    const normalizedPeriod = (period || "daily").toLowerCase();

    if (normalizedPeriod === "monthly") {
      periodStart = new Date(validDate.getFullYear(), validDate.getMonth(), 1, 0, 0, 0, 0);
      periodEnd = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (normalizedPeriod === "weekly") {
      // 7-day window ending on validDate end of day
      const endDay = new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate(), 23, 59, 59, 999);
      const startDay = new Date(endDay.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDay.setHours(0, 0, 0, 0);
      periodStart = startDay;
      periodEnd = endDay;
    } else {
      // daily (default)
      periodStart = new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate(), 0, 0, 0, 0);
      periodEnd = new Date(validDate.getFullYear(), validDate.getMonth(), validDate.getDate(), 23, 59, 59, 999);
    }

    // Filter bookings belonging to this period
    const periodBookings = allCompletedBookings.filter((b: any) => {
      const bDate = new Date(b.updatedAt || b.createdAt);
      return bDate >= periodStart && bDate <= periodEnd;
    });

    let periodGross = 0;
    for (const b of periodBookings) {
      let materialsTotal = 0;
      if (Array.isArray(b.materials)) {
        materialsTotal = (b.materials as any[]).reduce(
          (sum, m) => sum + Number(m.cost || 0) * Number(m.quantity || 1),
          0,
        );
      }
      const bTotal = b.amount + (b.additionalCost || 0) + materialsTotal;
      periodGross += bTotal;
    }

    const periodCommission = periodGross * 0.15;
    const periodNet = periodGross * 0.85;

    // Get wallet balance and pending withdrawals
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    const pendingPayouts = await this.prisma.payoutTransaction.findMany({
      where: {
        workerId: worker.id,
        status: "PENDING",
      },
    });

    const pendingClearance = pendingPayouts.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    const records = periodBookings.map((b: any) => {
      let materialsTotal = 0;
      if (Array.isArray(b.materials)) {
        materialsTotal = (b.materials as any[]).reduce(
          (sum, m) => sum + Number(m.cost || 0) * Number(m.quantity || 1),
          0,
        );
      }
      const grossAmt = b.amount + (b.additionalCost || 0) + materialsTotal;
      const commAmt = grossAmt * 0.15;
      const netAmt = grossAmt * 0.85;

      return {
        id: b.id,
        bookingId: b.id,
        jobId: b.id,
        serviceTitle: b.serviceName || "Service Job",
        serviceName: b.serviceName || "Service Job",
        customerName: b.user?.name || "Customer",
        amount: b.amount,
        grossAmount: Number(grossAmt.toFixed(2)),
        commissionAmount: Number(commAmt.toFixed(2)),
        netAmount: Number(netAmt.toFixed(2)),
        date: b.date || new Date(b.updatedAt || b.createdAt).toLocaleDateString(),
        createdAt: b.createdAt,
        dateTime: b.updatedAt || b.createdAt,
        rating: b.rating || 5.0,
        status: b.status,
      };
    });

    const summaryObj = {
      workerId: worker.id,
      period: normalizedPeriod,
      selectedDate: validDate.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      completedJobsCount: periodBookings.length,
      totalGross: Number(periodGross.toFixed(2)),
      totalCommission: Number(periodCommission.toFixed(2)),
      totalNet: Number(periodNet.toFixed(2)),
      commissionRate: "15%",
      grossEarnings: Number(periodGross.toFixed(2)),
      platformCommission: Number(periodCommission.toFixed(2)),
      netPayout: Number(periodNet.toFixed(2)),
      availableBalance: wallet ? Number(wallet.balance.toFixed(2)) : 0.0,
      pendingClearance: Number(pendingClearance.toFixed(2)),
      currency: "INR",
    };

    return {
      ...summaryObj,
      summary: summaryObj,
      records,
      recentEarnings: records,
    };
  }

  async getBreakdown(userId: string, period = "weekly") {
    const worker = await this.getWorkerByUserId(userId);

    const completedBookings: any = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: BookingStatus.COMPLETED,
      },
      orderBy: { updatedAt: "asc" },
    });

    const daysMap: Record<
      string,
      { gross: number; net: number; count: number }
    > = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      daysMap[key] = { gross: 0, net: 0, count: 0 };
    }

    for (const b of completedBookings) {
      const d = new Date(b.updatedAt || b.createdAt);
      const key = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      let materialsTotal = 0;
      if (Array.isArray(b.materials)) {
        materialsTotal = (b.materials as any[]).reduce(
          (sum, m) => sum + Number(m.cost || 0) * Number(m.quantity || 1),
          0,
        );
      }
      const bTotal = b.amount + (b.additionalCost || 0) + materialsTotal;
      const bNet = bTotal * 0.85;

      if (daysMap[key]) {
        daysMap[key].gross += bTotal;
        daysMap[key].net += bNet;
        daysMap[key].count += 1;
      }
    }

    const breakdown = Object.entries(daysMap).map(([label, data]) => ({
      label,
      gross: Number(data.gross.toFixed(2)),
      net: Number(data.net.toFixed(2)),
      jobsCount: data.count,
    }));

    return {
      period,
      breakdown,
    };
  }
}
