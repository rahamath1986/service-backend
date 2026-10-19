import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  RejectJobDto,
  StartJobDto,
  ProgressJobDto,
  MaterialsJobDto,
  AdditionalCostDto,
  CompleteJobDto,
  ReportIssueDto,
} from "./dto/job.dto";
import { BookingStatus } from "../common/enums/booking-status.enum";

@Injectable()
export class JobsService {
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
        if (worker && !worker.userId) {
          worker = await this.prisma.worker.update({
            where: { id: worker.id },
            data: { userId: user.id },
          });
        }
      }
    }
    if (!worker) {
      throw new ForbiddenException("Worker profile not found for this user");
    }
    return worker;
  }

  async getIncomingJobs(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const jobs = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: { in: [BookingStatus.REQUESTED, BookingStatus.UPCOMING] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jobs.map((job) => ({
      ...job,
      expiresInSeconds: 60, // 60 seconds lead timer for worker UI
      customer: job.user,
    }));
  }

  async getActiveJob(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const activeJob = await this.prisma.booking.findFirst({
      where: {
        workerId: worker.id,
        status: {
          in: [
            BookingStatus.ACCEPTED,
            BookingStatus.EN_ROUTE,
            BookingStatus.ARRIVED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.AWAITING_CONFIRMATION,
          ],
        },
      },
      include: {
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
      orderBy: { updatedAt: "desc" },
    });

    if (!activeJob) {
      return null;
    }

    return {
      ...activeJob,
      customer: activeJob.user,
    };
  }

  async getJobById(jobId: string, userId?: string) {
    const job = await this.prisma.booking.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            address: true,
          },
        },
        worker: true,
        chatRoom: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return {
      ...job,
      customer: job.user,
    };
  }

  async acceptJob(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.ACCEPTED,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return {
      success: true,
      message: "Job accepted successfully",
      job: updated,
    };
  }

  async rejectJob(jobId: string, userId: string, dto: RejectJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.DECLINED,
        declinedReason: dto.reason || "Worker declined",
      },
    });

    return {
      success: true,
      message: "Job rejected",
      job: updated,
    };
  }

  async markEnRoute(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.EN_ROUTE,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return {
      success: true,
      message: "Status updated to EN_ROUTE",
      job: updated,
    };
  }

  async markArrived(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.ARRIVED,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return {
      success: true,
      message: "Status updated to ARRIVED",
      job: updated,
    };
  }

  async startJob(jobId: string, userId: string, dto: StartJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    // OTP validation against booking.startOtp or standard test OTP '1234'
    const expectedOtp = job.startOtp || "1234";
    if (dto.otp !== expectedOtp && dto.otp !== "1234") {
      throw new BadRequestException("Invalid start OTP entered by customer");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        beforePhotos: dto.beforePhotos ?? job.beforePhotos,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return {
      success: true,
      message: "OTP verified. Job started successfully",
      job: updated,
    };
  }

  async updateProgress(jobId: string, userId: string, dto: ProgressJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        checklist: dto.checklist as any,
      },
    });

    return {
      success: true,
      message: "Checklist updated successfully",
      checklist: updated.checklist,
    };
  }

  async updateMaterials(jobId: string, userId: string, dto: MaterialsJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        materials: dto.materials as any,
      },
    });

    return {
      success: true,
      message: "Materials / spare parts updated successfully",
      materials: updated.materials,
    };
  }

  async addAdditionalCost(
    jobId: string,
    userId: string,
    dto: AdditionalCostDto,
  ) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        additionalCost: dto.additionalCost,
        additionalCostReason: dto.reason,
      },
    });

    return {
      success: true,
      message: "Additional charges submitted successfully",
      additionalCost: updated.additionalCost,
      reason: updated.additionalCostReason,
    };
  }

  async completeJob(jobId: string, userId: string, dto: CompleteJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    // Calculate materials cost if any
    let materialsTotal = 0;
    if (Array.isArray(job.materials)) {
      materialsTotal = (job.materials as any[]).reduce((sum, item) => {
        const itemCost = Number(item.cost || 0) * Number(item.quantity || 1);
        return sum + itemCost;
      }, 0);
    }

    const grossAmount = job.amount + (job.additionalCost || 0) + materialsTotal;
    const commission = grossAmount * 0.15; // 15% platform commission
    const netWorkerEarnings = grossAmount - commission;

    const updated = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.COMPLETED,
        amount: grossAmount,
        afterPhotos: dto.afterPhotos ?? job.afterPhotos,
        customerSignature: dto.customerSignature ?? job.customerSignature,
        isPaid: true,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Credit worker's wallet
    const workerWallet = await this.prisma.wallet.upsert({
      where: { userId: worker.userId || userId },
      update: {
        balance: { increment: netWorkerEarnings },
      },
      create: {
        userId: worker.userId || userId,
        balance: netWorkerEarnings,
      },
    });

    // Record wallet transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: workerWallet.id,
        title: `Job Earnings: #${jobId}`,
        subtitle: `Gross: ₹${grossAmount.toFixed(2)} (Net 85%: ₹${netWorkerEarnings.toFixed(2)})`,
        amount: netWorkerEarnings,
        date: new Date().toLocaleDateString("en-GB"),
        isCredit: true,
      },
    });

    return {
      success: true,
      message: "Job completed successfully and earnings credited to wallet",
      job: updated,
      summary: {
        baseAmount: job.amount,
        additionalCost: job.additionalCost,
        materialsTotal,
        grossAmount,
        commission,
        netWorkerEarnings,
      },
    };
  }

  async getJobHistory(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const history = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: {
          in: [
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.DECLINED,
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            address: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return history.map((item) => ({
      ...item,
      customer: item.user,
    }));
  }

  async reportIssue(jobId: string, userId: string, dto: ReportIssueDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        workerId: worker.id,
        bookingId: jobId,
        subject: `Job #${jobId} Issue: ${dto.issueType}`,
        description: dto.description,
        priority: "HIGH",
        category: "JOB",
        metadata: {
          issueType: dto.issueType,
          photos: dto.photos || [],
        },
      },
    });

    return {
      success: true,
      message: "Job dispute / issue reported successfully to support team",
      ticket,
    };
  }
}
