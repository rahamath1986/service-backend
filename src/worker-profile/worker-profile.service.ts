import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  UpdateWorkerProfileDto,
  UpdateAvailabilityDto,
  ToggleOnlineDto,
  UploadKycDto,
} from "./dto/worker-profile.dto";
import { KycStatus } from "../common/enums/kyc-status.enum";

@Injectable()
export class WorkerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWorkerByUserId(userId: string) {
    let worker: any = await this.prisma.worker.findUnique({
      where: { userId },
      include: {
        kycDocuments: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    } as any);

    if (!worker) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Check if worker with same phone exists
      const existingWorker = await this.prisma.worker.findFirst({
        where: { phone: user.phone },
      });

      if (existingWorker) {
        worker = await this.prisma.worker.update({
          where: { id: existingWorker.id },
          data: { userId: user.id },
          include: {
            kycDocuments: true,
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        } as any);
      } else {
        worker = await this.prisma.worker.create({
          data: {
            userId: user.id,
            name: user.name,
            phone: user.phone,
            profession: "Home Service Specialist",
            hourlyRate: 40.0,
            about: "ServiGo Verified Professional",
            avatarUrl: user.avatar,
            isVerified: true,
            isOnline: true,
          },
          include: {
            kycDocuments: true,
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        } as any);
      }
    }

    return worker;
  }

  async getProfile(userId: string) {
    const worker = await this.getOrCreateWorkerByUserId(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Calculate completed jobs count
    const completedJobsCount = await this.prisma.booking.count({
      where: {
        workerId: worker.id,
        status: "COMPLETED",
      },
    });

    // Check KYC status
    const verifiedKycCount = worker.kycDocuments.filter(
      (doc) => doc.status === KycStatus.VERIFIED,
    ).length;
    const kycOverallStatus =
      verifiedKycCount > 0
        ? "VERIFIED"
        : worker.kycDocuments.length > 0
          ? "PENDING"
          : "NOT_SUBMITTED";

    return {
      ...worker,
      email: user?.email,
      address: user?.address,
      completedJobsCount,
      kycStatus: kycOverallStatus,
    };
  }

  async updateProfile(userId: string, dto: UpdateWorkerProfileDto) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    const updatedWorker = await this.prisma.worker.update({
      where: { id: worker.id },
      data: {
        name: dto.name ?? undefined,
        phone: dto.phone ?? undefined,
        profession: dto.profession ?? undefined,
        experienceYears: dto.experienceYears ?? undefined,
        hourlyRate: dto.hourlyRate ?? undefined,
        about: dto.about ?? undefined,
        bankName: dto.bankName ?? undefined,
        accountNumber: dto.accountNumber ?? undefined,
        ifscCode: dto.ifscCode ?? undefined,
        upiId: dto.upiId ?? undefined,
        workingArea: dto.workingArea ?? undefined,
        serviceRadiusKm: dto.serviceRadiusKm ?? undefined,
      },
      include: {
        kycDocuments: true,
      },
    } as any);

    if (dto.name || dto.phone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name ?? undefined,
          phone: dto.phone ?? undefined,
        },
      });
    }

    return updatedWorker;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    await this.prisma.worker.update({
      where: { id: worker.id },
      data: { avatarUrl },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return {
      success: true,
      avatarUrl,
      message: "Avatar updated successfully",
    };
  }

  async getKyc(userId: string) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    const documents = await this.prisma.kycDocument.findMany({
      where: { workerId: worker.id },
      orderBy: { createdAt: "desc" },
    });

    const isVerified = documents.some((d) => d.status === KycStatus.VERIFIED);
    const hasPending = documents.some((d) => d.status === KycStatus.PENDING);

    return {
      workerId: worker.id,
      overallStatus: isVerified
        ? "VERIFIED"
        : hasPending
          ? "PENDING"
          : "NOT_SUBMITTED",
      documents,
    };
  }

  async uploadKyc(userId: string, dto: UploadKycDto, documentUrl?: string) {
    const worker = await this.getOrCreateWorkerByUserId(userId);
    const url = documentUrl || dto.documentUrl;

    if (!url) {
      throw new BadRequestException("Document file or documentUrl is required");
    }

    const doc = await this.prisma.kycDocument.create({
      data: {
        workerId: worker.id,
        documentType: dto.documentType.toUpperCase(),
        documentNumber: dto.documentNumber,
        documentUrl: url,
        status: KycStatus.PENDING,
      },
    });

    return {
      success: true,
      message: "KYC document uploaded successfully and pending verification",
      document: doc,
    };
  }

  async getAvailability(userId: string) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    return {
      workingArea: worker.workingArea || "All Areas",
      serviceRadiusKm: worker.serviceRadiusKm,
      workingDays: worker.workingDays,
      startTime: worker.startTime,
      endTime: worker.endTime,
      isFullTime: worker.isFullTime,
      isOnline: worker.isOnline,
    };
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    const updated: any = await this.prisma.worker.update({
      where: { id: worker.id },
      data: {
        workingArea: dto.workingArea ?? undefined,
        serviceRadiusKm: dto.serviceRadiusKm ?? undefined,
        workingDays: dto.workingDays ?? undefined,
        startTime: dto.startTime ?? undefined,
        endTime: dto.endTime ?? undefined,
        isFullTime: dto.isFullTime ?? undefined,
      },
    } as any);

    return {
      success: true,
      message: "Availability updated successfully",
      availability: {
        workingArea: updated.workingArea,
        serviceRadiusKm: updated.serviceRadiusKm,
        workingDays: updated.workingDays,
        startTime: updated.startTime,
        endTime: updated.endTime,
        isFullTime: updated.isFullTime,
      },
    };
  }

  async toggleOnline(userId: string, dto?: ToggleOnlineDto) {
    const worker = await this.getOrCreateWorkerByUserId(userId);

    const nextState =
      dto && dto.isOnline !== undefined ? dto.isOnline : !worker.isOnline;

    const updated: any = await this.prisma.worker.update({
      where: { id: worker.id },
      data: {
        isOnline: nextState,
      },
    } as any);

    return {
      success: true,
      isOnline: updated.isOnline,
      message: updated.isOnline
        ? "You are now online and ready to receive job requests"
        : "You are now offline",
    };
  }
}
