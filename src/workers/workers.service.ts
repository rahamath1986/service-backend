import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkers(serviceName?: string, filter = "Nearby") {
    const where: any = {};
    if (serviceName && serviceName !== "All") {
      where.profession = {
        contains: serviceName,
        mode: "insensitive",
      };
    }

    let orderBy: any = { distanceKm: "asc" };
    if (filter === "Top Rated") {
      orderBy = { rating: "desc" };
    } else if (filter === "Price: Low to High") {
      orderBy = { hourlyRate: "asc" };
    } else if (filter === "Experience") {
      orderBy = { experienceYears: "desc" };
    }

    return this.prisma.worker.findMany({
      where,
      orderBy,
    });
  }

  async getWorkerById(id: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        reviews: true,
      },
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID ${id} not found`);
    }

    return worker;
  }

  async getWorkerReviews(workerId: string) {
    return this.prisma.review.findMany({
      where: { workerId },
      orderBy: { createdAt: "desc" },
    });
  }
}
