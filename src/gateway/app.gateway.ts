import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    const workerId = client.handshake.query.workerId as string;
    const userId = client.handshake.query.userId as string;

    if (workerId) {
      client.join(`worker_${workerId}`);
      this.logger.log(
        `Worker connected: ${workerId} (Socket ID: ${client.id})`,
      );
    }

    if (userId) {
      client.join(`user_${userId}`);
      this.logger.log(`User connected: ${userId} (Socket ID: ${client.id})`);
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_room")
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room?: string; jobId?: string; bookingId?: string },
  ) {
    const room = data.room || data.jobId || data.bookingId;
    if (room) {
      const roomKey = room.startsWith("room_") ? room : `room_${room}`;
      client.join(roomKey);
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${roomKey}`);
      return { success: true, room: roomKey };
    }
  }

  @SubscribeMessage("location_update")
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      workerId?: string;
      userId?: string;
      jobId?: string;
      latitude: number;
      longitude: number;
    },
  ) {
    try {
      if (data.workerId || data.userId) {
        await this.prisma.worker.updateMany({
          where: {
            OR: [
              ...(data.workerId ? [{ id: data.workerId }] : []),
              ...(data.userId ? [{ userId: data.userId }] : []),
            ],
          },
          data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude,
          },
        });
      }

      const payload = {
        workerId: data.workerId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      };

      if (data.jobId) {
        const roomKey = data.jobId.startsWith("room_")
          ? data.jobId
          : `room_${data.jobId}`;
        this.server.to(roomKey).to(data.jobId).emit("location_update", payload);
      } else {
        this.server.emit("location_update", payload);
      }

      return { success: true };
    } catch (err: any) {
      this.logger.error(`Error handling location update: ${err.message}`);
      return { error: err.message };
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      room?: string;
      conversationId?: string;
      jobId?: string;
      senderId: string;
      text: string;
      imageUrl?: string;
    },
  ) {
    try {
      const roomIdInput = data.room || data.conversationId || data.jobId;
      if (!roomIdInput) return;

      const roomKey = roomIdInput.startsWith("room_")
        ? roomIdInput
        : `room_${roomIdInput}`;
      const bookingId = roomIdInput.replace("room_", "");

      let chatRoom = await this.prisma.chatRoom.findFirst({
        where: {
          OR: [{ id: roomKey }, { bookingId }],
        },
      });

      if (!chatRoom) {
        chatRoom = await this.prisma.chatRoom.create({
          data: {
            id: roomKey,
            bookingId,
          },
        });
      }

      const timeString = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const message = await this.prisma.chatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: data.senderId,
          text: data.text,
          time: timeString,
          imageUrl: data.imageUrl,
        },
      });

      const responsePayload = {
        id: message.id,
        senderId: message.senderId,
        text: message.text,
        time: message.time,
        type: message.type.toLowerCase(),
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
      };

      this.server
        .to(roomKey)
        .to(bookingId)
        .emit("new_message", responsePayload);

      return responsePayload;
    } catch (err: any) {
      this.logger.error(`Error sending message: ${err.message}`);
      return { error: err.message };
    }
  }

  // Method to dispatch job_request to worker
  dispatchJobRequest(workerId: string, jobData: any) {
    this.server.to(`worker_${workerId}`).emit("job_request", jobData);
    this.server.emit("job_request", jobData); // broadcast as fallback
  }
}
