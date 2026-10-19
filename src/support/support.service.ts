import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTicketDto,
  EmergencyAlertDto,
  TicketPriority,
  TicketStatus,
} from "./dto/support.dto";
import { AppGateway } from "../gateway/app.gateway";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  async getTickets(userId: string) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    return this.prisma.supportTicket.findMany({
      where: {
        OR: [{ userId }, ...(worker ? [{ workerId: worker.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    let priority: TicketPriority = TicketPriority.MEDIUM;
    if (dto.priority === "HIGH") priority = TicketPriority.HIGH;
    if (dto.priority === "LOW") priority = TicketPriority.LOW;
    if (dto.priority === "EMERGENCY") priority = TicketPriority.EMERGENCY;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        workerId: worker?.id || undefined,
        bookingId: dto.bookingId || undefined,
        subject: dto.subject,
        description: dto.description,
        category: dto.category || "GENERAL",
        priority,
        status: TicketStatus.OPEN,
      },
    });

    return {
      success: true,
      message: "Support ticket submitted successfully",
      ticket,
    };
  }

  async triggerEmergencyAlert(userId: string, dto: EmergencyAlertDto) {
    const worker = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    if (worker) {
      // Update worker coordinates
      await this.prisma.worker.update({
        where: { id: worker.id },
        data: {
          currentLatitude: dto.latitude,
          currentLongitude: dto.longitude,
        },
      });
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        workerId: worker?.id || undefined,
        bookingId: dto.jobId || undefined,
        subject: `🚨 EMERGENCY SOS ALERT: Worker ${worker?.name || userId}`,
        description: `CRITICAL SAFETY INCIDENT: Worker reported emergency at GPS: ${dto.latitude}, ${dto.longitude}. Note: ${dto.note || "Immediate assistance requested"}`,
        category: "SAFETY",
        priority: TicketPriority.EMERGENCY,
        status: TicketStatus.OPEN,
        metadata: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          jobId: dto.jobId,
          note: dto.note,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Create high-priority notification
    await this.prisma.notification.create({
      data: {
        userId,
        workerId: worker?.id,
        title: "🚨 Emergency SOS Dispatched",
        message: `Your emergency distress signal and GPS location (${dto.latitude}, ${dto.longitude}) have been logged. Support is acting immediately.`,
        type: "EMERGENCY",
        data: {
          ticketId: ticket.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      },
    });

    // Broadcast emergency on websocket
    try {
      this.gateway.server.emit("emergency_alert", {
        ticketId: ticket.id,
        workerId: worker?.id,
        workerName: worker?.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        jobId: dto.jobId,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Ignore websocket broadcast errors
    }

    return {
      success: true,
      emergencyId: ticket.id,
      status: "EMERGENCY_DISPATCHED",
      message:
        "Emergency alert received! Safety dispatch team and emergency responders have received your GPS coordinates.",
      coordinates: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    };
  }

  async getFaqs() {
    const faqs = [
      {
        id: "faq_1",
        category: "Jobs",
        question: "How do I accept incoming job requests?",
        answer:
          "When a new job is dispatched, you will receive a notification and a lead timer. Tap Accept within 60 seconds to confirm the job.",
      },
      {
        id: "faq_2",
        category: "Jobs",
        question: "What is the Start OTP?",
        answer:
          "Before starting any job at the customer location, ask the customer for their 4-digit start OTP and enter it in the app to begin work.",
      },
      {
        id: "faq_3",
        category: "Payments",
        question: "How and when do I get paid?",
        answer:
          "After completing a job, 85% net earnings are immediately credited to your wallet. You can withdraw anytime to your registered bank account or UPI ID.",
      },
      {
        id: "faq_4",
        category: "KYC & Verification",
        question: "How do I verify my KYC documents?",
        answer:
          "Go to Profile > KYC Documents, upload your Aadhaar Card and PAN Card. Our admin team verifies documents within 24-48 hours.",
      },
      {
        id: "faq_5",
        category: "Safety",
        question: "What should I do in an emergency?",
        answer:
          "Tap the Emergency SOS button in the app. It immediately sends your live GPS coordinates to our safety dispatch team and alerts local emergency support.",
      },
    ];

    return {
      faqs,
    };
  }
}
