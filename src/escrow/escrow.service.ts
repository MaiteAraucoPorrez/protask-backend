import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscrowDeposit, EscrowEstado } from './entities/escrow-deposit.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { CrearDepositoDto } from './dto/crear-deposito.dto';
import { EscrowQueryDto } from './dto/escrow-query.dto';
import { ApiResponse, PaginationMeta } from '../common/dto/api-response.dto';

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(EscrowDeposit)
    private escrowRepository: Repository<EscrowDeposit>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
  ) {}

  async depositar(dto: CrearDepositoDto, clienteId: string): Promise<EscrowDeposit> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: dto.proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    if (proposal.project.client.id !== clienteId) {
      throw new ForbiddenException('No eres el cliente de este proyecto');
    }

    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'Solo se puede depositar en escrow para propuestas aceptadas',
      );
    }

    const existente = await this.escrowRepository.findOne({
      where: { proposal: { id: proposal.id } },
    });

    if (existente) {
      throw new ConflictException('Ya existe un depósito en escrow para esta propuesta');
    }

    const deposito = this.escrowRepository.create({
      proposal,
      cliente: proposal.project.client,
      freelancer: proposal.freelancer,
      monto: proposal.offeredPrice,
      estado: EscrowEstado.RETENIDO,
    });

    return this.escrowRepository.save(deposito);
  }

  async misDepositos(clienteId: string, query: EscrowQueryDto): Promise<ApiResponse<EscrowDeposit[]>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.escrowRepository.findAndCount({
      where: { cliente: { id: clienteId } },
      relations: ['proposal', 'proposal.project', 'freelancer'],
      order: { depositadoEn: 'DESC' },
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

    return ApiResponse.info(items, 'Depósitos recuperados correctamente', pagination);
  }

  async misFondos(freelancerId: string, query: EscrowQueryDto): Promise<ApiResponse<EscrowDeposit[]>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.escrowRepository.findAndCount({
      where: { freelancer: { id: freelancerId } },
      relations: ['proposal', 'proposal.project', 'cliente'],
      order: { depositadoEn: 'DESC' },
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

    return ApiResponse.info(items, 'Fondos recuperados correctamente', pagination);
  }

  async findOne(id: string, userId: string): Promise<EscrowDeposit> {
    const deposito = await this.escrowRepository.findOne({
      where: { id },
      relations: ['proposal', 'proposal.project', 'cliente', 'freelancer'],
    });

    if (!deposito) {
      throw new NotFoundException('Depósito en escrow no encontrado');
    }

    const esCliente = deposito.cliente.id === userId;
    const esFreelancer = deposito.freelancer.id === userId;

    if (!esCliente && !esFreelancer) {
      throw new ForbiddenException('No tienes acceso a este depósito');
    }

    return deposito;
  }
}