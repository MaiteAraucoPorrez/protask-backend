import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(createDto: CreateProjectDto, client: User): Promise<Project> {
    const project = this.projectRepository.create({
      ...createDto,
      client,
      status: 'open',
    });
    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      relations: ['client'],
      order: { createdAt: 'DESC' },
    });
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
    return this.projectRepository.save(project);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);
    
    if (project.client.id !== userId) {
      throw new ForbiddenException('No puedes eliminar un proyecto que no te pertenece');
    }
    
    await this.projectRepository.remove(project);
  }
}