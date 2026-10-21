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
import { BookingStatus as BookingStatusEnum } from "../common/enums/booking-status.enum";
const BookingStatus: any = BookingStatusEnum;
type BookingStatus = any;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  formatJobForWorker(b: any) {
    if (!b) return null;
    const customerObj = b.customer || b.user;
    return {
      ...b,
      serviceTitle: b.serviceTitle || b.serviceName || "Home Service",
      serviceName: b.serviceName || b.serviceTitle || "Home Service",
      customerName: customerObj?.name || b.customerName || "Customer",
      customerPhone: customerObj?.phone || b.customerPhone || "",
      customerAvatar: customerObj?.avatar || b.customerAvatar || null,
      customerAddress: b.address || customerObj?.address || "",
      address: b.address || customerObj?.address || "",
      issueDescription: b.issueDescription || b.note || "",
      note: b.note || b.issueDescription || "",
      customerOtp: b.customerOtp || b.startOtp || "1234",
      startOtp: b.startOtp || b.customerOtp || "1234",
      expiresAfterSeconds: b.expiresAfterSeconds || 60,
      expiresInSeconds: b.expiresInSeconds || 60,
      customer: customerObj,
      user: customerObj,
    };
  }

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

    const jobs: any = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: { in: [BookingStatus.REQUESTED, BookingStatus.UPCOMING] } as any,
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

    const formatted = jobs.map((job: any) => this.formatJobForWorker(job));
    return {
      jobs: formatted,
    };
  }

  async getActiveJob(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const activeJob: any = await this.prisma.booking.findFirst({
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
        } as any,
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
      return { job: null };
    }

    const formatted = this.formatJobForWorker(activeJob);
    return {
      job: formatted,
      ...formatted,
    };
  }

  async getJobById(jobId: string, userId?: string) {
    const job: any = await this.prisma.booking.findUnique({
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

    const formatted = this.formatJobForWorker(job);
    return {
      job: formatted,
      ...formatted,
    };
  }

  async acceptJob(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.ACCEPTED,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    });

    return {
      success: true,
      message: "Job accepted successfully",
      job: this.formatJobForWorker(updated),
    };
  }

  async rejectJob(jobId: string, userId: string, dto: RejectJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.DECLINED,
        declinedReason: dto.reason || "Worker declined",
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: "Job rejected",
      job: this.formatJobForWorker(updated),
    };
  }

  async markEnRoute(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.EN_ROUTE,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    });

    return {
      success: true,
      message: "Status updated to EN_ROUTE",
      job: this.formatJobForWorker(updated),
    };
  }

  async markArrived(jobId: string, userId: string) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.ARRIVED,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    });

    return {
      success: true,
      message: "Status updated to ARRIVED",
      job: this.formatJobForWorker(updated),
    };
  }

  async startJob(jobId: string, userId: string, dto: StartJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    // OTP validation against booking.startOtp, last 4 digits of booking ID, or standard test OTP '1234'
    const expectedOtp = job.startOtp || "1234";
    const bookingIdLast4 = job.id && job.id.length >= 4 ? job.id.slice(-4) : "";
    const isOtpValid =
      dto.otp === expectedOtp ||
      dto.otp === "1234" ||
      (bookingIdLast4 && dto.otp === bookingIdLast4);

    if (!isOtpValid) {
      throw new BadRequestException("Invalid start OTP entered by customer");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        beforePhotos: dto.beforePhotos ?? job.beforePhotos,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: "OTP verified. Job started successfully",
      job: this.formatJobForWorker(updated),
    };
  }

  async updateProgress(jobId: string, userId: string, dto: ProgressJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        checklist: dto.checklist as any,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: "Checklist updated successfully",
      job: this.formatJobForWorker(updated),
      checklist: updated.checklist,
    };
  }

  async toggleChecklist(jobId: string, userId: string, body: any) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const checklistId = body?.checklistId || body?.id;
    const isCompleted = body?.isCompleted !== undefined ? Boolean(body.isCompleted) : true;

    let existingChecklist: any[] = [];
    if (Array.isArray(job.checklist)) {
      existingChecklist = [...(job.checklist as any[])];
    }

    const itemIndex = existingChecklist.findIndex(
      (item: any) => item.id === checklistId || item.checklistId === checklistId,
    );

    if (itemIndex >= 0) {
      existingChecklist[itemIndex] = {
        ...existingChecklist[itemIndex],
        isCompleted,
      };
    } else if (checklistId) {
      existingChecklist.push({
        id: checklistId,
        checklistId,
        task: body?.task || `Step ${checklistId}`,
        isCompleted,
      });
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        checklist: existingChecklist as any,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: "Checklist updated successfully",
      job: this.formatJobForWorker(updated),
      checklist: updated.checklist,
    };
  }

  async updateMaterials(jobId: string, userId: string, dto: any) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    let existingMaterials: any[] = [];
    if (Array.isArray(job.materials)) {
      existingMaterials = [...(job.materials as any[])];
    }

    let newMaterialsList: any[] = [];
    if (dto && Array.isArray(dto.materials)) {
      newMaterialsList = dto.materials;
    } else if (
      dto &&
      (dto.name || dto.item || dto.cost !== undefined || dto.price !== undefined)
    ) {
      // Single material item object sent from Flutter app
      const singleItem = {
        id: dto.id || `mat_${Date.now()}`,
        name: dto.name || dto.item || "Material / Spare Part",
        quantity: Number(dto.quantity || 1),
        cost: Number(dto.cost || dto.price || 0),
      };
      const existingIdx = existingMaterials.findIndex(
        (m) => m.id === singleItem.id,
      );
      if (existingIdx >= 0) {
        existingMaterials[existingIdx] = singleItem;
      } else {
        existingMaterials.push(singleItem);
      }
      newMaterialsList = existingMaterials;
    } else {
      newMaterialsList = existingMaterials;
    }

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        materials: newMaterialsList as any,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: "Materials / spare parts updated successfully",
      job: this.formatJobForWorker(updated),
      materials: updated.materials,
    };
  }

  async addAdditionalCost(
    jobId: string,
    userId: string,
    dto: AdditionalCostDto,
  ) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.workerId !== worker.id) {
      throw new ForbiddenException("You are not assigned to this job");
    }

    const shouldRequireApproval =
      dto.requiresApproval ?? (dto.additionalCost > 0);
    const newStatus = shouldRequireApproval
      ? BookingStatus.AWAITING_CONFIRMATION
      : job.status;

    const updated: any = await this.prisma.booking.update({
      where: { id: jobId },
      data: {
        additionalCost: dto.additionalCost,
        additionalCostReason: dto.reason || job.additionalCostReason,
        status: newStatus,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

    return {
      success: true,
      message: shouldRequireApproval
        ? "Additional charges submitted and awaiting customer approval"
        : "Additional charges updated",
      job: this.formatJobForWorker(updated),
      additionalCost: updated.additionalCost,
      reason: updated.additionalCostReason,
      status: updated.status,
    };
  }

  async completeJob(jobId: string, userId: string, dto: CompleteJobDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

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

    const updated: any = await this.prisma.booking.update({
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
          select: { id: true, name: true, phone: true, avatar: true, address: true },
        },
      },
    } as any);

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
    } as any);

    return {
      success: true,
      message: "Job completed and earnings credited",
      job: this.formatJobForWorker(updated),
      netWorkerEarnings,
      commission,
      grossAmount,
      walletBalance: workerWallet.balance + netWorkerEarnings,
    };
  }

  async getJobHistory(userId: string) {
    const worker = await this.getWorkerByUserId(userId);

    const history: any = await this.prisma.booking.findMany({
      where: {
        workerId: worker.id,
        status: {
          in: [
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.DECLINED,
          ],
        } as any,
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

    const formatted = history.map((item: any) => this.formatJobForWorker(item));
    return {
      jobs: formatted,
    };
  }

  async reportIssue(jobId: string, userId: string, dto: ReportIssueDto) {
    const worker = await this.getWorkerByUserId(userId);
    const job: any = await this.prisma.booking.findUnique({ where: { id: jobId } });

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
