import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto/chat.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: "Get messages for a conversation or jobId" })
  @Get(":conversationId/messages")
  async getMessages(
    @Param("conversationId") conversationId: string,
    @Request() req: any,
  ) {
    return this.chatService.getMessages(conversationId, req.user.userId);
  }

  @ApiOperation({ summary: "Send message to a conversation" })
  @Post(":conversationId/messages")
  async sendMessage(
    @Param("conversationId") conversationId: string,
    @Request() req: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, req.user.userId, dto);
  }

  @ApiOperation({ summary: "Send message for a jobId (/chat/:jobId/send)" })
  @Post(":conversationId/send")
  @HttpCode(HttpStatus.OK)
  async sendMessageJobAlias(
    @Param("conversationId") conversationId: string,
    @Request() req: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, req.user.userId, dto);
  }
}
