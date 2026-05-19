import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(projectId: string, createDto: CreateProposalDto, freelancer: User): Promise<Proposal> {
    //Verificar que el proyecto existe y cargar la relación con client
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['client'],
    });
    
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    // Validar que el proyecto tenga un cliente asignado
    if (!project.client) {
      throw new BadRequestException('El proyecto no tiene un cliente asignado');
    }

    // Verificar que el proyecto está abierto a propuestas
    if (project.status !== 'open') {
      throw new BadRequestException('Este proyecto ya no está abierto a propuestas');
    }

    // Verificar que el freelancer no sea el mismo que el cliente que publicó
    if (project.client.id === freelancer.id) {
      throw new ForbiddenException('No puedes enviar propuesta a tu propio proyecto');
    }

    // 5. Verificación KYC deshabilitada temporalmente
    // TODO: Activar cuando el módulo de verificación esté listo
    // if (project.isCorporate && !freelancer.isVerified) {
    //   throw new ForbiddenException('Perfil no verificado. Debes completar la verificación KYC para postular a proyectos corporativos');
    // }

    //Crear la propuesta
    const proposal = this.proposalRepository.create({
      ...createDto,
      project,
      freelancer,
      status: 'pending',
    });

    return this.proposalRepository.save(proposal);
  }

  async findByProject(projectId: string): Promise<Proposal[]> {
    return this.proposalRepository.find({
      where: { project: { id: projectId } },
      relations: ['freelancer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByFreelancer(freelancerId: string): Promise<Proposal[]> {
    return this.proposalRepository.find({
      where: { freelancer: { id: freelancerId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['project', 'freelancer'],
    });
    
    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }
    
    return proposal;
  }
}