import { ChatRoom } from '../entities/chat-room.entity';

export class RoomParticipantDto {
  id: string;
  name: string;
  avatarUrl?: string;

  constructor(user: { id: string; name: string; avatarUrl?: string }) {
    this.id = user.id;
    this.name = user.name;
    this.avatarUrl = user.avatarUrl;
  }
}

export class RoomResponseDto {
  id: string;
  proposalId: string;
  client: RoomParticipantDto;
  freelancer: RoomParticipantDto;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;

  constructor(room: ChatRoom) {
    this.id = room.id;
    this.proposalId = (room.proposal as any)?.id ?? (room as any).proposalId;
    this.client = new RoomParticipantDto(room.client);
    this.freelancer = new RoomParticipantDto(room.freelancer);
    this.lastMessage = room.lastMessage;
    this.lastMessageAt = room.lastMessageAt;
    this.createdAt = room.createdAt;
  }
}
