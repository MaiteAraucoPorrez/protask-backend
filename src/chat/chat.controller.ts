import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms/proposal/:proposalId')
  getOrCreateRoom(
    @Param('proposalId') proposalId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub;
    return this.chatService.getOrCreateRoom(proposalId, userId);
  }

  @Get('rooms')
  getUserRooms(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.chatService.getUserRooms(userId);
  }

  @Get('rooms/:roomId/messages')
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub;
    return this.chatService.getRoomMessages(roomId, userId, query);
  }

  //Send a message to a room via REST (alternative to WebSocket).
  @Post('rooms/:roomId/messages')
  sendMessage(
    @Param('roomId') roomId: string,
    @Body() dto: Pick<SendMessageDto, 'content'>,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub;
    return this.chatService.saveMessage(roomId, userId, dto.content);
  }
}
