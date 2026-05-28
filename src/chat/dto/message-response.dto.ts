import { ChatMessage } from '../entities/chat-message.entity';

export class MessageSenderDto {
  id: string;
  name: string;
  avatarUrl?: string;

  constructor(sender: { id: string; name: string; avatarUrl?: string }) {
    this.id = sender.id;
    this.name = sender.name;
    this.avatarUrl = sender.avatarUrl;
  }
}

export class MessageResponseDto {
  id: string;
  roomId: string;
  sender: MessageSenderDto;
  content: string;
  isRead: boolean;
  createdAt: Date;

  constructor(msg: ChatMessage) {
    this.id = msg.id;
    this.roomId = (msg.room as any)?.id ?? (msg as any).roomId;
    this.sender = new MessageSenderDto(msg.sender);
    this.content = msg.content;
    this.isRead = msg.isRead;
    this.createdAt = msg.createdAt;
  }
}
