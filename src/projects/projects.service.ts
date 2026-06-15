import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Project } from './entities/project.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { User } from '../users/entities/user.entity';
import { ApiResponse, PaginationMeta } from '../common/dto/api-response.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createDto: CreateProjectDto, clientPayload: any): Promise<Project> {
    const client = await this.usersRepository.findOne({ where: { id: clientPayload.sub } });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    const project = this.projectRepository.create({
      ...createDto,
      client,
      status: 'open',
    });
    const saved = await this.projectRepository.save(project);

    // Limpiar caché de listados
    await this.cacheManager.del('/api/projects');

    return saved;
  }

  async findAll(query: ProjectQueryDto): Promise<ApiResponse<Project[]>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.projectRepository.findAndCount({
      relations: ['client'],
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

    return ApiResponse.info(items, 'Proyectos recuperados correctamente', pagination);
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['client'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return project;
  }

  async update(id: string, updateDto: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.findOne(id);
    if (project.client.id !== userId) {
      throw new ForbiddenException('No puedes editar un proyecto que no te pertenece');
    }
    Object.assign(project, updateDto);
    const updated = await this.projectRepository.save(project);

    // Limpiar caché de listados y del proyecto específico
    await this.cacheManager.del('/api/projects');
    await this.cacheManager.del(`/api/projects/${id}`);

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);
    if (project.client.id !== userId) {
      throw new ForbiddenException('No puedes eliminar un proyecto que no te pertenece');
    }
    await this.projectRepository.remove(project);

    // Limpiar caché de listados y del proyecto específico
    await this.cacheManager.del('/api/projects');
    await this.cacheManager.del(`/api/projects/${id}`);
  }
  async cancel(id: string, userId: string): Promise<Project> {
    const project = await this.findOne(id);

    if (project.client.id !== userId) {
      throw new ForbiddenException(
          'No puedes cancelar un proyecto que no te pertenece',
      );
    }

    if (project.status === 'in_progress') {
      throw new BadRequestException(
          'No puedes cancelar un proyecto que ya está en progreso',
      );
    }

    if (project.status === 'completed') {
      throw new BadRequestException(
          'No puedes cancelar un proyecto que ya fue completado',
      );
    }

    if (project.status === 'cancelled') {
      throw new BadRequestException(
          'Este proyecto ya fue cancelado',
      );
    }

    const pendingProposals = await this.proposalRepository.find({
      where: {
        project: {
          id: project.id,
        },
        status: 'pending',
      },
      relations: ['project'],
    });

    pendingProposals.forEach((proposal) => {
      proposal.status = 'rejected';
    });

    if (pendingProposals.length > 0) {
      await this.proposalRepository.save(pendingProposals);
    }

    project.status = 'cancelled';

    const cancelledProject = await this.projectRepository.save(project);

    await this.cacheManager.del('/api/projects');
    await this.cacheManager.del(`/api/projects/${id}`);

    return cancelledProject;
  }
}