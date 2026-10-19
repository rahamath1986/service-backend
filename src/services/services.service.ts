import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllServices(search?: string) {
    if (search && search.trim().length > 0) {
      return this.prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
      });
    }

    return this.prisma.service.findMany({
      orderBy: { name: "asc" },
    });
  }

  async getFeaturedServices() {
    return this.prisma.service.findMany({
      where: { isFeatured: true },
    });
  }

  async getServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }
}
