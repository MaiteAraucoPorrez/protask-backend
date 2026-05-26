import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus, DisputeResolution } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { Proposal } from '../proposal/entities/proposal.entity';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowEstado } from '../escrow/entities/escrow-deposit.entity';
import { ApiResponse } from '../common/dto/api-response.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private evidenceRepository: Repository<DisputeEvidence>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    private escrowService: EscrowService,
  ) {}

  async create(
    dto: CreateDisputeDto,
    clientId: string,
    files: Express.Multer.File[],
  ): Promise<ApiResponse<Dispute>> {
    // 1. Verificar propuesta
    const proposal = await this.proposalRepository.findOne({
      where: { id: dto.proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    // 2. Verificar que el cliente es el dueño
    if (proposal.project.client.id !== clientId) {
      throw new ForbiddenException('No eres el cliente de este proyecto');
    }

    // 3. Verificar que hay un depósito en escrow y está retenido
    const deposito = await this.escrowService.findByProposal(proposal.id);
    if (!deposito || deposito.estado !== EscrowEstado.RETENIDO) {
      throw new BadRequestException('Solo se puede abrir disputa si el pago está retenido en escrow');
    }

    // 4. Verificar que no haya una disputa activa para esta propuesta
    const existingDispute = await this.disputeRepository.findOne({
      where: { proposal: { id: proposal.id }, status: DisputeStatus.PENDING },
    });
    if (existingDispute) {
      throw new BadRequestException('Ya existe una disputa activa para esta propuesta');
    }

    // 5. Crear la disputa
    const dispute = this.disputeRepository.create({
      reason: dto.reason,
      description: dto.description,
      status: DisputeStatus.PENDING,
      proposal,
      client: proposal.project.client,
      freelancer: proposal.freelancer,
      escrowDeposit: deposito,
    });

    const savedDispute = await this.disputeRepository.save(dispute);

    // 6. Guardar evidencias
    if (files && files.length > 0) {
      const evidences = files.map((file) =>
        this.evidenceRepository.create({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          dispute: savedDispute,
        }),
      );
      await this.evidenceRepository.save(evidences);
      
      savedDispute.evidencePaths = evidences.map(e => e.path);
      await this.disputeRepository.save(savedDispute);
    }

    return ApiResponse.success(savedDispute, 'Disputa abierta exitosamente. Un administrador la revisará.');
  }

  async findAll(status?: DisputeStatus): Promise<ApiResponse<Dispute[]>> {
    const where: any = {};
    if (status) where.status = status;

    const disputes = await this.disputeRepository.find({
      where,
      relations: ['proposal', 'proposal.project', 'client', 'freelancer', 'escrowDeposit'],
      order: { createdAt: 'DESC' },
    });

    return ApiResponse.info(disputes, 'Disputas recuperadas correctamente');
  }

  async findOne(id: string): Promise<ApiResponse<Dispute>> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['proposal', 'proposal.project', 'client', 'freelancer', 'escrowDeposit'],
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    return ApiResponse.info(dispute, 'Disputa recuperada');
  }

  async resolve(
    id: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ): Promise<ApiResponse<Dispute>> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['proposal', 'escrowDeposit', 'client', 'freelancer'],
    });

    if (!dispute) {
      throw new NotFoundException('Disputa no encontrada');
    }

    if (dispute.status !== DisputeStatus.PENDING) {
      throw new BadRequestException('Esta disputa ya fue resuelta');
    }

    // Ejecutar la resolución
    if (dto.resolution === DisputeResolution.RELEASE_PAYMENT) {
      await this.escrowService.liberar(dispute.proposal.id, dispute.client.id);
    } else if (dto.resolution === DisputeResolution.REFUND) {
      await this.escrowService.reembolsar(dispute.proposal.id);
    }
    // REQUEST_CORRECTION no afecta el escrow

    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution = dto.resolution;
    dispute.resolutionComment = dto.resolutionComment;
    dispute.resolvedBy = adminId;
    dispute.resolvedAt = new Date();

    const updated = await this.disputeRepository.save(dispute);

    return ApiResponse.success(updated, 'Disputa resuelta exitosamente');
  }
}