import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SendMessageDto } from "./dto/chat.dto";
import { MessageType } from "@prisma/client";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessages(conversationId: string, userId: string) {
    let room = await this.prisma.chatRoom.findFirst({
      where: {
        OR: [{ id: conversationId }, { bookingId: conversationId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!room) {
      // Create empty room if not found
      room = await this.prisma.chatRoom.create({
        data: {
          id: conversationId.startsWith("room_")
            ? conversationId
            : `room_${conversationId}`,
          bookingId: conversationId.replace("room_", ""),
        },
        include: {
          messages: true,
        },
      });
    }

    return room.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      text: m.text,
      time: m.time,
      isMe: m.senderId === userId,
      type: m.type.toLowerCase(),
      imageUrl: m.imageUrl,
    }));
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    let room = await this.prisma.chatRoom.findFirst({
      where: {
        OR: [{ id: conversationId }, { bookingId: conversationId }],
      },
    });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          id: conversationId.startsWith("room_")
            ? conversationId
            : `room_${conversationId}`,
          bookingId: conversationId.replace("room_", ""),
        },
      });
    }

    const timeString = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msg = await this.prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: userId,
        text: dto.text,
        time: timeString,
        isMe: true,
        type: (dto.type || "TEXT").toUpperCase() as MessageType,
        imageUrl: dto.imageUrl,
      },
    });

    return {
      id: msg.id,
      senderId: msg.senderId,
      text: msg.text,
      time: msg.time,
      isMe: true,
      type: msg.type.toLowerCase(),
      imageUrl: msg.imageUrl,
    };
  }
}
