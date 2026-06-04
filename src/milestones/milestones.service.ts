import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Milestone, MilestoneStatus } from './entities/milestone.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { RevisionMilestoneDto } from './dto/revision-milestone.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { ApiResponse } from '../common/dto/api-response.dto';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private milestoneRepository: Repository<Milestone>,

    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
  ) {}

  private async loadMilestone(id: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id },
      relations: ['proposal', 'proposal.project', 'proposal.project.client', 'proposal.freelancer'],
    });
    if (!milestone) throw new NotFoundException('Hito no encontrado');
    return milestone;
  }

  private assertIsClient(milestone: Milestone, userId: string): void {
    if (milestone.proposal.project.client.id !== userId) {
      throw new ForbiddenException('Solo el cliente puede realizar esta acción');
    }
  }

  private assertIsFreelancer(milestone: Milestone, userId: string): void {
    if (milestone.proposal.freelancer.id !== userId) {
      throw new ForbiddenException('Solo el freelancer puede realizar esta acción');
    }
  }

  private assertIsParticipant(milestone: Milestone, userId: string): void {
    const clientId = milestone.proposal.project.client.id;
    const freelancerId = milestone.proposal.freelancer.id;
    if (userId !== clientId && userId !== freelancerId) {
      throw new ForbiddenException('No tienes acceso a este hito');
    }
  }

  async create(
    dto: CreateMilestoneDto,
    clientId: string,
  ): Promise<ApiResponse<MilestoneResponseDto>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: dto.proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) throw new NotFoundException('Propuesta no encontrada');

    if (proposal.project.client.id !== clientId) {
      throw new ForbiddenException('Solo el cliente puede crear hitos para este proyecto');
    }

    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'Solo se pueden crear hitos para propuestas aceptadas',
      );
    }

    const existingSum = await this.milestoneRepository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.amount), 0)', 'total')
      .where('m.proposal = :proposalId', { proposalId: dto.proposalId })
      .getRawOne<{ total: string }>();

    const currentTotal = parseFloat(existingSum?.total ?? '0');
    const offeredPrice = Number(proposal.offeredPrice);

    if (currentTotal + dto.amount > offeredPrice) {
      throw new BadRequestException(
        `El monto del hito (${dto.amount}) supera el saldo disponible ` +
          `(${(offeredPrice - currentTotal).toFixed(2)} de ${offeredPrice} acordados)`,
      );
    }

    let order = dto.order;
    if (!order) {
      const count = await this.milestoneRepository.count({
        where: { proposal: { id: dto.proposalId } },
      });
      order = count + 1;
    }

    const milestone = this.milestoneRepository.create({
      title: dto.title,
      description: dto.description,
      amount: dto.amount,
      dueDate: new Date(dto.dueDate),
      order,
      status: MilestoneStatus.PENDIENTE,
      proposal,
    });

    const saved = await this.milestoneRepository.save(milestone);

    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Hito creado exitosamente',
    );
  }

  async findByProposal(
    proposalId: string,
    userId: string,
  ): Promise<ApiResponse<MilestoneResponseDto[]>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) throw new NotFoundException('Propuesta no encontrada');

    const clientId = proposal.project.client.id;
    const freelancerId = proposal.freelancer.id;

    if (userId !== clientId && userId !== freelancerId) {
      throw new ForbiddenException('No tienes acceso a los hitos de esta propuesta');
    }

    const milestones = await this.milestoneRepository.find({
      where: { proposal: { id: proposalId } },
      relations: ['proposal'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });

    const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const approvedAmount = milestones
      .filter((m) => m.status === MilestoneStatus.APROBADO)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    return ApiResponse.info(
      milestones.map((m) => new MilestoneResponseDto(m)),
      `${milestones.length} hito(s) encontrado(s). ` +
        `Total asignado: ${totalAmount.toFixed(2)} | Aprobado: ${approvedAmount.toFixed(2)}`,
    );
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);
    this.assertIsParticipant(milestone, userId);
    return ApiResponse.info(new MilestoneResponseDto(milestone), 'Hito encontrado');
  }

  async update(
    id: string,
    dto: UpdateMilestoneDto,
    clientId: string,
  ): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsClient(milestone, clientId);

    if (milestone.status !== MilestoneStatus.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden editar hitos en estado "pendiente"',
      );
    }

    if (dto.amount !== undefined) {
      const offeredPrice = Number(milestone.proposal.offeredPrice);

      const existingSum = await this.milestoneRepository
        .createQueryBuilder('m')
        .select('COALESCE(SUM(m.amount), 0)', 'total')
        .where('m.proposal = :proposalId', { proposalId: milestone.proposal.id })
        .andWhere('m.id != :milestoneId', { milestoneId: id })
        .getRawOne<{ total: string }>();

      const otherTotal = parseFloat(existingSum?.total ?? '0');

      if (otherTotal + dto.amount > offeredPrice) {
        throw new BadRequestException(
          `El monto del hito (${dto.amount}) supera el saldo disponible ` +
            `(${(offeredPrice - otherTotal).toFixed(2)} de ${offeredPrice} acordados)`,
        );
      }
    }

    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.description !== undefined) milestone.description = dto.description;
    if (dto.amount !== undefined) milestone.amount = dto.amount;
    if (dto.dueDate !== undefined) milestone.dueDate = new Date(dto.dueDate);
    if (dto.order !== undefined) milestone.order = dto.order;

    const saved = await this.milestoneRepository.save(milestone);
    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Hito actualizado exitosamente',
    );
  }

  async remove(id: string, clientId: string): Promise<ApiResponse<null>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsClient(milestone, clientId);

    if (milestone.status !== MilestoneStatus.PENDIENTE) {
      throw new BadRequestException(
        'No se puede eliminar un hito que ya está en progreso o completado',
      );
    }

    await this.milestoneRepository.remove(milestone);

    return ApiResponse.success(null, 'Hito eliminado exitosamente');
  }

  async start(id: string, freelancerId: string): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsFreelancer(milestone, freelancerId);

    if (milestone.status !== MilestoneStatus.PENDIENTE) {
      throw new BadRequestException(
        `No se puede iniciar un hito en estado "${milestone.status}". Debe estar en "pendiente"`,
      );
    }

    const inProgress = await this.milestoneRepository.findOne({
      where: {
        proposal: { id: milestone.proposal.id },
        status: MilestoneStatus.EN_PROGRESO,
      },
    });

    if (inProgress) {
      throw new ConflictException(
        `Ya existe el hito "${inProgress.title}" en progreso. ` +
          'Completa el hito actual antes de iniciar otro.',
      );
    }

    const previousPending = await this.milestoneRepository
      .createQueryBuilder('m')
      .where('m.proposal = :proposalId', { proposalId: milestone.proposal.id })
      .andWhere('m.status = :status', { status: MilestoneStatus.PENDIENTE })
      .andWhere('m.order < :order', { order: milestone.order })
      .andWhere('m.id != :id', { id: milestone.id })
      .getOne();

    if (previousPending) {
      throw new BadRequestException(
        `Debes completar el hito #${previousPending.order} "${previousPending.title}" antes de iniciar éste`,
      );
    }

    milestone.status = MilestoneStatus.EN_PROGRESO;
    const saved = await this.milestoneRepository.save(milestone);
    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Hito iniciado. ¡Manos a la obra!',
    );
  }

  async submit(
    id: string,
    dto: SubmitMilestoneDto,
    freelancerId: string,
  ): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsFreelancer(milestone, freelancerId);

    const allowedStatuses: MilestoneStatus[] = [
      MilestoneStatus.EN_PROGRESO,
      MilestoneStatus.REVISION_SOLICITADA,
    ];

    if (!allowedStatuses.includes(milestone.status)) {
      throw new BadRequestException(
        `No se puede entregar un hito en estado "${milestone.status}". ` +
          'Debe estar en "en_progreso" o "revision_solicitada"',
      );
    }

    milestone.status = MilestoneStatus.ENTREGADO;
    milestone.submissionComment = dto.submissionComment;
    milestone.submittedAt = new Date();
    milestone.revisionComment = undefined;

    const saved = await this.milestoneRepository.save(milestone);
    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Hito entregado. Esperando aprobación del cliente.',
    );
  }

  async approve(id: string, clientId: string): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsClient(milestone, clientId);

    if (milestone.status !== MilestoneStatus.ENTREGADO) {
      throw new BadRequestException(
        `Solo se puede aprobar un hito en estado "entregado". ` +
          `Estado actual: "${milestone.status}"`,
      );
    }

    milestone.status = MilestoneStatus.APROBADO;
    milestone.approvedAt = new Date();

    const saved = await this.milestoneRepository.save(milestone);
    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Hito aprobado. Pago liberado para este hito.',
    );
  }

  async requestRevision(
    id: string,
    dto: RevisionMilestoneDto,
    clientId: string,
  ): Promise<ApiResponse<MilestoneResponseDto>> {
    const milestone = await this.loadMilestone(id);

    this.assertIsClient(milestone, clientId);

    if (milestone.status !== MilestoneStatus.ENTREGADO) {
      throw new BadRequestException(
        `Solo se puede solicitar revisión de un hito en estado "entregado". ` +
          `Estado actual: "${milestone.status}"`,
      );
    }

    milestone.status = MilestoneStatus.REVISION_SOLICITADA;
    milestone.revisionComment = dto.revisionComment;

    const saved = await this.milestoneRepository.save(milestone);
    const full = await this.loadMilestone(saved.id);

    return ApiResponse.success(
      new MilestoneResponseDto(full),
      'Revisión solicitada. El freelancer ha sido notificado.',
    );
  }

  async getSummary(
    proposalId: string,
    userId: string,
  ): Promise<ApiResponse<object>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) throw new NotFoundException('Propuesta no encontrada');

    const clientId = proposal.project.client.id;
    const freelancerId = proposal.freelancer.id;

    if (userId !== clientId && userId !== freelancerId) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    const milestones = await this.milestoneRepository.find({
      where: { proposal: { id: proposalId } },
    });

    const total = milestones.length;
    const byStatus = {
      pendiente: 0,
      en_progreso: 0,
      entregado: 0,
      aprobado: 0,
      revision_solicitada: 0,
    };

    let totalAmount = 0;
    let approvedAmount = 0;

    for (const m of milestones) {
      byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
      totalAmount += Number(m.amount);
      if (m.status === MilestoneStatus.APROBADO) {
        approvedAmount += Number(m.amount);
      }
    }

    const offeredPrice = Number(proposal.offeredPrice);
    const progressPercent =
      total > 0
        ? Math.round((byStatus.aprobado / total) * 100)
        : 0;

    return ApiResponse.info(
      {
        proposalId,
        offeredPrice,
        totalMilestones: total,
        byStatus,
        totalAmountAssigned: parseFloat(totalAmount.toFixed(2)),
        remainingBudget: parseFloat((offeredPrice - totalAmount).toFixed(2)),
        approvedAmount: parseFloat(approvedAmount.toFixed(2)),
        pendingAmount: parseFloat((totalAmount - approvedAmount).toFixed(2)),
        progressPercent,
      },
      'Resumen de hitos obtenido',
    );
  }
}
