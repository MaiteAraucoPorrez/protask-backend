import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { ApiResponse, PaginationMeta } from '../common/dto/api-response.dto';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(projectId: string, createDto: CreateProposalDto, freelancerPayload: any): Promise<Proposal> {
    const freelancer = await this.usersRepository.findOne({
      where: { id: freelancerPayload.sub },
    });
    if (!freelancer) {
      throw new NotFoundException('Freelancer no encontrado');
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['client'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (!project.client) {
      throw new BadRequestException('El proyecto no tiene un cliente asignado');
    }
    if (project.status !== 'open') {
      throw new BadRequestException('Este proyecto ya no está abierto a propuestas');
    }
    if (project.client.id === freelancer.id) {
      throw new ForbiddenException('No puedes enviar propuesta a tu propio proyecto');
    }
    if (!freelancer.isVerified) {
      throw new ForbiddenException('Perfil no verificado. Debes completar la verificación KYC para postular a proyectos');
    }

    const proposal = this.proposalRepository.create({
      ...createDto,
      project,
      freelancer,
      status: 'pending',
    });
    return this.proposalRepository.save(proposal);
  }

  async findByProject(projectId: string, query: ProposalQueryDto): Promise<ApiResponse<Proposal[]>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.proposalRepository.findAndCount({
      where: { project: { id: projectId } },
      relations: ['freelancer'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);
    const pagination = new PaginationMeta();
    pagination.totalCount = totalCount;
    pagination.pageSize = limit;
    pagination.currentPage = page;
    pagination.totalPages = totalPages;
    pagination.hasNextPage = page < totalPages;
    pagination.hasPreviousPage = page > 1;

    return ApiResponse.info(items, 'Propuestas recuperadas correctamente', pagination);
  }

  async findByFreelancer(freelancerId: string, query: ProposalQueryDto): Promise<ApiResponse<Proposal[]>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.proposalRepository.findAndCount({
      where: { freelancer: { id: freelancerId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);
    const pagination = new PaginationMeta();
    pagination.totalCount = totalCount;
    pagination.pageSize = limit;
    pagination.currentPage = page;
    pagination.totalPages = totalPages;
    pagination.hasNextPage = page < totalPages;
    pagination.hasPreviousPage = page > 1;

    return ApiResponse.info(items, 'Tus propuestas recuperadas correctamente', pagination);
  }

  async findOne(id: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['project', 'project.client', 'freelancer'],
    });
    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }
    return proposal;
  }

  async acceptProposal(proposalId: string, clientId: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });
    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }
    if (proposal.project.client.id !== clientId) {
      throw new ForbiddenException('No tienes permiso para aceptar esta propuesta');
    }
    if (proposal.status !== 'pending') {
      throw new BadRequestException('Esta propuesta ya fue aceptada o rechazada');
    }

    proposal.status = 'accepted';
    await this.proposalRepository.save(proposal);

    await this.proposalRepository.update(
      { project: { id: proposal.project.id }, status: 'pending' },
      { status: 'rejected' },
    );

    await this.projectRepository.update(proposal.project.id, {
      status: 'in_progress',
    });

    return proposal;
  }
  async rejectProposal(proposalId: string, clientId: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (proposal.project.client.id !== clientId) {
      throw new ForbiddenException('No tienes permiso para rechazar esta propuesta');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Solo puedes rechazar propuestas pendientes');
    }

    proposal.status = 'rejected';

    return this.proposalRepository.save(proposal);
  }
  async withdrawProposal(proposalId: string, freelancerId: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['freelancer', 'project'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (proposal.freelancer.id !== freelancerId) {
      throw new ForbiddenException('No tienes permiso para retirar esta propuesta');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Solo puedes retirar propuestas pendientes');
    }

    proposal.status = 'rejected';

    return this.proposalRepository.save(proposal);
  }
  async deleteProposal(proposalId: string, freelancerId: string): Promise<ApiResponse<null>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (proposal.freelancer.id !== freelancerId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta propuesta');
    }

    if (proposal.status === 'accepted') {
      throw new BadRequestException('No puedes eliminar una propuesta aceptada');
    }

    await this.proposalRepository.remove(proposal);

    return ApiResponse.success(
        null,
        'Propuesta eliminada correctamente',
    );
  }
  async updateProposal(
      proposalId: string,
      updateDto: UpdateProposalDto,
      freelancerId: string,
  ): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['freelancer', 'project'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (proposal.freelancer.id !== freelancerId) {
      throw new ForbiddenException('No tienes permiso para editar esta propuesta');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestException('Solo puedes editar propuestas pendientes');
    }

    if (updateDto.offeredPrice !== undefined) {
      proposal.offeredPrice = updateDto.offeredPrice;
    }

    if (updateDto.estimatedDays !== undefined) {
      proposal.estimatedDays = updateDto.estimatedDays;
    }

    if (updateDto.description !== undefined) {
      proposal.description = updateDto.description;
    }

    return this.proposalRepository.save(proposal);
  }
}