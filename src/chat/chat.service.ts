import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { RoomResponseDto } from './dto/room-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ApiResponse, PaginationMeta } from '../common/dto/api-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Proposal } from '../proposal/entities/proposal.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private roomRepo: Repository<ChatRoom>,

    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,

    @InjectRepository(Proposal)
    private proposalRepo: Repository<Proposal>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ─── Get or create room for an accepted proposal ──────────────────────────
  async getOrCreateRoom(
    proposalId: string,
    requesterId: string,
  ): Promise<ApiResponse<RoomResponseDto>> {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'El chat solo está disponible para propuestas aceptadas',
      );
    }

    const clientId = proposal.project.client.id;
    const freelancerId = proposal.freelancer.id;

    if (requesterId !== clientId && requesterId !== freelancerId) {
      throw new ForbiddenException('No eres participante de esta propuesta');
    }

    const existing = await this.roomRepo.findOne({
      where: { proposal: { id: proposalId } },
      relations: ['proposal', 'client', 'freelancer'],
    });

    if (existing) {
      return ApiResponse.success(new RoomResponseDto(existing), 'Sala de chat obtenida');
    }

    const room = this.roomRepo.create({
      proposal,
      client: proposal.project.client,
      freelancer: proposal.freelancer,
    });

    const saved = await this.roomRepo.save(room);
    const full = await this.roomRepo.findOne({
      where: { id: saved.id },
      relations: ['proposal', 'client', 'freelancer'],
    });

    return ApiResponse.success(
      new RoomResponseDto(full!),
      'Sala de chat creada',
    );
  }

  // ─── List all rooms for a user ─────────────────────────────────────────────
  async getUserRooms(userId: string): Promise<ApiResponse<RoomResponseDto[]>> {
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.proposal', 'proposal')
      .leftJoinAndSelect('room.client', 'client')
      .leftJoinAndSelect('room.freelancer', 'freelancer')
      .where('client.id = :userId OR freelancer.id = :userId', { userId })
      .orderBy('room.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('room.createdAt', 'DESC')
      .getMany();

    return ApiResponse.info(
      rooms.map((r) => new RoomResponseDto(r)),
      `${rooms.length} sala(s) encontrada(s)`,
    );
  }

  // ─── Get messages for a room (paginated) ──────────────────────────────────
  async getRoomMessages(
    roomId: string,
    userId: string,
    query: PaginationQueryDto,
  ): Promise<ApiResponse<MessageResponseDto[]>> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['client', 'freelancer'],
    });

    if (!room) throw new NotFoundException('Sala no encontrada');

    if (room.client.id !== userId && room.freelancer.id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta sala');
    }

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { room: { id: roomId } },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.skip,
    });

    const meta = new PaginationMeta();
    meta.totalCount = total;
    meta.pageSize = query.limit ?? 10;
    meta.currentPage = query.page ?? 1;
    meta.totalPages = Math.ceil(total / (query.limit ?? 10));
    meta.hasNextPage = (query.page ?? 1) < meta.totalPages;
    meta.hasPreviousPage = (query.page ?? 1) > 1;

    // Mark messages from the other user as read
    await this.messageRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('"roomId" = :roomId AND "senderId" != :userId AND "isRead" = false', {
        roomId,
        userId,
      })
      .execute();

    return ApiResponse.info(
      messages.reverse().map((m) => new MessageResponseDto(m)),
      `${total} mensaje(s) en la sala`,
      meta,
    );
  }

  // ─── Save a message (called by gateway) ───────────────────────────────────
  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['client', 'freelancer'],
    });

    if (!room) throw new NotFoundException('Sala no encontrada');

    if (room.client.id !== senderId && room.freelancer.id !== senderId) {
      throw new ForbiddenException('No eres participante de esta sala');
    }

    const sender = await this.userRepo.findOneOrFail({ where: { id: senderId } });

    const message = this.messageRepo.create({ room, sender, content });
    const saved = await this.messageRepo.save(message);

    // Update last message cache on the room
    await this.roomRepo.update(roomId, {
      lastMessage: content.length > 80 ? content.substring(0, 80) + '…' : content,
      lastMessageAt: saved.createdAt,
    });

    return new MessageResponseDto(saved);
  }

  // ─── Verify a user is participant of a room ────────────────────────────────
  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['client', 'freelancer'],
    });
    if (!room) return false;
    return room.client.id === userId || room.freelancer.id === userId;
  }
}
