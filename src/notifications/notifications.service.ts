import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    return this.prisma.notification.findMany({
      where: {
        OR: [{ userId }, ...(worker ? [{ workerId: worker.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    const count = await this.prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ userId }, ...(worker ? [{ workerId: worker.id }] : [])],
      },
    });

    return { unreadCount: count };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    await this.prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [{ userId }, ...(worker ? [{ workerId: worker.id }] : [])],
      },
      data: { isRead: true },
    });

    return { success: true, message: "All notifications marked as read" };
  }

  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type || "GENERAL",
        data: dto.data || undefined,
        workerId: dto.workerId || undefined,
        userId: dto.userId || undefined,
      },
    });
  }
}
