import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookingStatus as BookingStatusEnum } from "../common/enums/booking-status.enum";
const BookingStatus: any = BookingStatusEnum;
type BookingStatus = any;

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWorkerByUserId(userId: string) {
    let worker = await this.prisma.worker.findUnique({
      where: { userId },
    });
    if (!worker) {
      // Try by phone
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        worker = await this.prisma.worker.findFirst({
          where: { phone: user.phone },
        });
      }
    }
    if (!worker) {
      throw new NotFoundException("Worker profile not found for this user");
    }
    return worker;
  }

  async getSummary(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const completedBookings: any = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: BookingStatus.COMPLETED,
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let grossEarnings = 0;
    let todayEarnings = 0;
    let thisWeekEarnings = 0;
    let thisMonthEarnings = 0;

    for (const b of completedBookings) {
      let materialsTotal = 0;
      if (Array.isArray(b.materials)) {
        materialsTotal = (b.materials as any[]).reduce(
          (sum, m) => sum + Number(m.cost || 0) * Number(m.quantity || 1),
          0,
        );
      }
      const bTotal = b.amount + (b.additionalCost || 0) + materialsTotal;
      const bNet = bTotal * 0.85;

      grossEarnings += bTotal;

      const updatedTime = new Date(b.updatedAt);
      if (updatedTime >= startOfToday) {
        todayEarnings += bNet;
      }
      if (updatedTime >= sevenDaysAgo) {
        thisWeekEarnings += bNet;
      }
      if (updatedTime >= startOfMonth) {
        thisMonthEarnings += bNet;
      }
    }

    const platformCommission = grossEarnings * 0.15;
    const netPayout = grossEarnings * 0.85;

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

    const records = completedBookings.slice(0, 30).map((b: any) => ({
      id: b.id,
      bookingId: b.id,
      jobId: b.id,
      serviceTitle: b.serviceName,
      serviceName: b.serviceName,
      amount: b.amount,
      netAmount: Number((b.amount * 0.85).toFixed(2)),
      date: b.date || new Date(b.createdAt).toLocaleDateString(),
      createdAt: b.createdAt,
      status: b.status,
    }));

    const summaryObj = {
      workerId: worker.id,
      totalCompletedJobs: completedBookings.length,
      grossEarnings: Number(grossEarnings.toFixed(2)),
      platformCommission: Number(platformCommission.toFixed(2)),
      commissionRate: "15%",
      netPayout: Number(netPayout.toFixed(2)),
      availableBalance: wallet ? Number(wallet.balance.toFixed(2)) : 0.0,
      pendingClearance: Number(pendingClearance.toFixed(2)),
      todayEarnings: Number(todayEarnings.toFixed(2)),
      thisWeekEarnings: Number(thisWeekEarnings.toFixed(2)),
      thisMonthEarnings: Number(thisMonthEarnings.toFixed(2)),
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
      const d = new Date(b.updatedAt);
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
