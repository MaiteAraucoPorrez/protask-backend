import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Auth on connect ───────────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new Error('Token no proporcionado');

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.emit('error', { message: 'Autenticación fallida' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // nothing to clean up — socket.io handles room cleanup automatically
  }

  // ─── join_room ─────────────────────────────────────────────────────────────
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId: string = client.data.userId;

    if (!data?.roomId) {
      client.emit('error', { message: 'roomId requerido' });
      return;
    }

    const allowed = await this.chatService.isParticipant(data.roomId, userId);
    if (!allowed) {
      client.emit('error', { message: 'No tienes acceso a esta sala' });
      return;
    }

    await client.join(data.roomId);
    client.emit('room_joined', { roomId: data.roomId });
  }

  // ─── send_message ──────────────────────────────────────────────────────────
  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId: string = client.data.userId;

    try {
      const message = await this.chatService.saveMessage(
        dto.roomId,
        userId,
        dto.content,
      );

      // Broadcast to everyone in the room (including sender for confirmation)
      this.server.to(dto.roomId).emit('new_message', message);
    } catch (err: any) {
      client.emit('error', { message: err.message ?? 'Error al enviar mensaje' });
    }
  }
}
