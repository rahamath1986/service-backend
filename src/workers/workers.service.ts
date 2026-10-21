import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  private getSearchTerms(serviceName: string): string[] {
    const trimmed = serviceName.trim();
    const lower = trimmed.toLowerCase();
    const terms = [trimmed];

    if (lower.includes("plumb")) terms.push("plumb");
    if (lower.includes("electr")) terms.push("electr");
    if (lower.includes("clean")) terms.push("clean");
    if (lower.includes("paint")) terms.push("paint");
    if (lower.includes("carpent")) {
      terms.push("carpent");
    } else if (lower.includes("car repair") || lower.includes("car mechanic") || lower === "car") {
      terms.push("car repair", "car mechanic");
    }
    if (lower.includes("ac") || lower.includes("air condition")) {
      terms.push("ac service", "ac repair", "ac technician", "air condition", "ac");
    }
    if (lower.includes("appliance")) terms.push("appliance");
    if (lower.includes("driv")) terms.push("driv");
    if (lower.includes("tow")) terms.push("tow");
    if (lower.includes("bike")) terms.push("bike");

    return Array.from(new Set(terms.filter((t) => t.length > 0)));
  }

  async getWorkers(serviceName?: string, filter = "Nearby") {
    const where: any = {};
    if (serviceName && serviceName.trim().length > 0 && serviceName.toLowerCase() !== "all") {
      const terms = this.getSearchTerms(serviceName);
      where.OR = terms.map((term) => ({
        profession: {
          contains: term,
          mode: "insensitive",
        },
      }));
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
