import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryFile } from './entities/delivery-file.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Proposal } from '../proposal/entities/proposal.entity';
import { User } from '../users/entities/user.entity';
import { ApiResponse } from '../common/dto/api-response.dto';
import { DeliveryResponseDto } from './dto/delivery-response.dto';
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
  ) {}

  async create(
    createDto: CreateDeliveryDto,
    files: Express.Multer.File[],
    freelancerId: string,
  ): Promise<ApiResponse<DeliveryResponseDto>> {
    // 1. Verificar que la propuesta existe y está aceptada
    const proposal = await this.proposalRepository.findOne({
      where: { id: createDto.proposalId },
      relations: ['project', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    // 2. Verificar que el freelancer es el asignado
    if (proposal.freelancer.id !== freelancerId) {
      throw new ForbiddenException('No eres el freelancer asignado a esta propuesta');
    }

    // 3. Verificar que la propuesta está aceptada
    if (proposal.status !== 'accepted') {
      throw new BadRequestException('La propuesta no ha sido aceptada aún');
    }

    // 4. Verificar que no hay una entrega pendiente sin revisar
    const pendingDelivery = await this.deliveryRepository.findOne({
      where: {
        proposal: { id: createDto.proposalId },
        status: DeliveryStatus.PENDING,
      },
    });

    if (pendingDelivery) {
      throw new BadRequestException('Ya tienes una entrega pendiente de revisión');
    }

    // 5. Crear la entrega
    const delivery = this.deliveryRepository.create({
      comment: createDto.comment,
      status: DeliveryStatus.PENDING,
      version: 1,
      proposal,
      freelancer: proposal.freelancer,
    });

    const savedDelivery = await this.deliveryRepository.save(delivery);

    // 6. Guardar los archivos
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
}