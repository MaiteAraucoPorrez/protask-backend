import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat/rooms/proposal/:proposalId
   * Get or create the chat room for an accepted proposal.
   * Only the client or freelancer of that proposal can access it.
   */
  @Post('rooms/proposal/:proposalId')
  getOrCreateRoom(
    @Param('proposalId') proposalId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub;
    return this.chatService.getOrCreateRoom(proposalId, userId);
  }

  /**
   * GET /chat/rooms
   * List all chat rooms the authenticated user participates in.
   */
  @Get('rooms')
  getUserRooms(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.chatService.getUserRooms(userId);
  }

  /**
   * GET /chat/rooms/:roomId/messages?page=1&limit=20
   * Paginated message history. Also marks received messages as read.
   */
  @Get('rooms/:roomId/messages')
  getRoomMessages(
    @Param('roomId') roomId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.sub;
    return this.chatService.getRoomMessages(roomId, userId, query);
  }
}
