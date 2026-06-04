import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Review, ReviewerRole } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import { Proposal } from '../proposal/entities/proposal.entity';
import { User } from '../users/entities/user.entity';
import { Delivery, DeliveryStatus } from '../deliveries/entities/delivery.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,

    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // HU-F11 / HU-F12 : Crear reseña
  // ─────────────────────────────────────────────────────────────
  async create(
    dto: CreateReviewDto,
    reviewerId: string,
  ): Promise<ApiResponse<ReviewResponseDto>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: dto.proposalId },
      relations: ['project', 'project.client', 'freelancer'],
    });

    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    const clientId = proposal.project.client.id;
    const freelancerId = proposal.freelancer.id;
    const isClient = reviewerId === clientId;
    const isFreelancer = reviewerId === freelancerId;

    if (!isClient && !isFreelancer) {
      throw new ForbiddenException(
        'Solo el cliente o el freelancer del proyecto pueden dejar una reseña',
      );
    }

    if (proposal.status !== 'accepted') {
      throw new BadRequestException(
        'Solo se puede calificar en proyectos con propuesta aceptada',
      );
    }

    const approvedDelivery = await this.deliveryRepository.findOne({
      where: {
        proposal: { id: dto.proposalId },
        status: DeliveryStatus.APPROVED,
      },
    });

    if (!approvedDelivery) {
      throw new BadRequestException(
        'No puedes calificar hasta que el cliente apruebe la entrega del proyecto',
      );
    }

    const existing = await this.reviewRepository.findOne({
      where: {
        proposal: { id: dto.proposalId },
        reviewer: { id: reviewerId },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya dejaste una reseña para este proyecto',
      );
    }

    const reviewer = isClient ? proposal.project.client : proposal.freelancer;
    const reviewed = isClient ? proposal.freelancer : proposal.project.client;
    const reviewerRole = isClient ? ReviewerRole.CLIENT : ReviewerRole.FREELANCER;

    const review = this.reviewRepository.create({
      proposal,
      reviewer,
      reviewed,
      rating: dto.rating,
      comment: dto.comment,
      reviewerRole,
    });

    const saved = await this.reviewRepository.save(review);

    await this.recalcUserRating(reviewed.id);

    const full = await this.reviewRepository.findOne({
      where: { id: saved.id },
      relations: ['proposal', 'reviewer', 'reviewed'],
    });

    return ApiResponse.success(
      new ReviewResponseDto(full!),
      isClient
        ? 'Freelancer calificado exitosamente'
        : 'Cliente calificado exitosamente',
    );
  }

  async findByUser(userId: string): Promise<ApiResponse<ReviewResponseDto[]>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const reviews = await this.reviewRepository.find({
      where: { reviewed: { id: userId } },
      relations: ['proposal', 'reviewer', 'reviewed'],
      order: { createdAt: 'DESC' },
    });

    return ApiResponse.info(
      reviews.map((r) => new ReviewResponseDto(r)),
      `${reviews.length} reseña(s) encontrada(s)`,
    );
  }

  async findByProposal(proposalId: string): Promise<ApiResponse<ReviewResponseDto[]>> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    const reviews = await this.reviewRepository.find({
      where: { proposal: { id: proposalId } },
      relations: ['proposal', 'reviewer', 'reviewed'],
      order: { createdAt: 'ASC' },
    });

    return ApiResponse.info(
      reviews.map((r) => new ReviewResponseDto(r)),
      `${reviews.length} reseña(s) para esta propuesta`,
    );
  }

  private async recalcUserRating(userId: string): Promise<void> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'total')
      .where('review.reviewedId = :userId', { userId })
      .getRawOne<{ avg: string; total: string }>();

    const avg = parseFloat(result?.avg ?? '0');
    const total = parseInt(result?.total ?? '0', 10);

    await this.userRepository.update(userId, {
      rating: parseFloat(avg.toFixed(2)),
      totalReviews: total,
    });
  }
}
