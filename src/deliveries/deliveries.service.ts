import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryFile } from './entities/delivery-file.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Proposal } from '../proposal/entities/proposal.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../common/dto/api-response.dto';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
import { EscrowService } from '../escrow/escrow.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(DeliveryFile)
    private deliveryFileRepository: Repository<DeliveryFile>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private readonly escrowService: EscrowService,
  ) {}
  async create(
    createDto: CreateDeliveryDto,
    files: Express.Multer.File[],
    freelancerId: string,
  ): Promise<ApiResponse<DeliveryResponseDto>> {
    // Verificar que la propuesta existe y está aceptada
    const proposal = await this.proposalRepository.findOne({
      where: { id: createDto.proposalId },
      relations: ['project', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    // Verificar que el freelancer es el asignado
    if (proposal.freelancer.id !== freelancerId) {
      throw new ForbiddenException('No eres el freelancer asignado a esta propuesta');
    }

    // Verificar que la propuesta está aceptada
    if (proposal.status !== 'accepted') {
      throw new BadRequestException('La propuesta no ha sido aceptada aún');
    }

    // Verificar que no hay una entrega pendiente sin revisar
    const pendingDelivery = await this.deliveryRepository.findOne({
      where: {
        proposal: { id: createDto.proposalId },
        status: DeliveryStatus.PENDING,
      },
    });

    if (pendingDelivery) {
      throw new BadRequestException('Ya tienes una entrega pendiente de revisión');
    }

    // Crear la entrega
    const delivery = this.deliveryRepository.create({
      comment: createDto.comment,
      status: DeliveryStatus.PENDING,
      version: 1,
      proposal,
      freelancer: proposal.freelancer,
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);

    // Guardar los archivos
    if (files && files.length > 0) {
      const deliveryFiles = files.map((file) =>
        this.deliveryFileRepository.create({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          delivery: savedDelivery,
        }),
      );
      await this.deliveryFileRepository.save(deliveryFiles);
      savedDelivery.files = deliveryFiles;
    }

    return ApiResponse.success(
      new DeliveryResponseDto(savedDelivery),
      'Entrega subida exitosamente',
    );
  }

  async findByProposal(proposalId: string): Promise<ApiResponse<DeliveryResponseDto[]>> {
    const deliveries = await this.deliveryRepository.find({
      where: { proposal: { id: proposalId } },
      relations: ['proposal', 'freelancer', 'files'],
      order: { version: 'DESC' },
    });

    const data = deliveries.map((d) => new DeliveryResponseDto(d));
    return ApiResponse.info(data, 'Entregas recuperadas correctamente');
  }

  async findOne(id: string): Promise<ApiResponse<DeliveryResponseDto>> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: ['proposal', 'freelancer', 'files'],
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    return ApiResponse.info(new DeliveryResponseDto(delivery), 'Entrega recuperada');
  }


  async approve(id: string, clientId: string): Promise<ApiResponse<DeliveryResponseDto>> {
  const delivery = await this.deliveryRepository.findOne({
    where: { id },
    relations: ['proposal','proposal.project', 'proposal.project.client', 'freelancer', 'files'],
  });

  if (!delivery) {
    throw new NotFoundException('Entrega no encontrada');
  }

  // Verificar que el cliente sea el dueño del proyecto
  if (delivery.proposal.project.client.id !== clientId) {
    throw new ForbiddenException('No eres el cliente del proyecto');
  }

  if (delivery.status !== DeliveryStatus.PENDING) {
    throw new BadRequestException('Esta entrega no está pendiente de revisión');
  }

  // Liberar pago en escrow
  await this.escrowService.liberar(delivery.proposal.id, clientId);

  // Actualizar estado de la entrega
  delivery.status = DeliveryStatus.APPROVED;
    delivery.proposal.project.status = 'completed';
    await this.projectRepository.save(delivery.proposal.project);
  const updated = await this.deliveryRepository.save(delivery);

  return ApiResponse.success(
    new DeliveryResponseDto(updated),
    'Entrega aprobada y pago liberado exitosamente',
  );
}

async requestRevision(
  id: string,
  clientId: string,
  revisionComment: string,
): Promise<ApiResponse<DeliveryResponseDto>> {
  const delivery = await this.deliveryRepository.findOne({
    where: { id },
    relations: ['proposal', 'proposal.project.client', 'freelancer', 'files'],
  });

  if (!delivery) {
    throw new NotFoundException('Entrega no encontrada');
  }

  if (delivery.proposal.project.client.id !== clientId) {
    throw new ForbiddenException('No eres el cliente del proyecto');
  }

  if (delivery.status !== DeliveryStatus.PENDING) {
    throw new BadRequestException('Esta entrega no está pendiente de revisión');
  }

  delivery.status = DeliveryStatus.REVISION_REQUESTED;
  delivery.revisionComment = revisionComment;
  delivery.revisionCount += 1;
  const updated = await this.deliveryRepository.save(delivery);

  return ApiResponse.success(
    new DeliveryResponseDto(updated),
    'Solicitud de revisión enviada. El freelancer deberá corregir la entrega.',
  );
}

}