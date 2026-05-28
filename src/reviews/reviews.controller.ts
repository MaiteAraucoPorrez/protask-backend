import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * HU-F11: Cliente califica al freelancer
   * HU-F12: Freelancer califica al cliente
   *
   * Disponible para CLIENT y FREELANCER (el service determina
   * a quién se le asigna la reseña según el rol del token).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  create(@Body() dto: CreateReviewDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.reviewsService.create(dto, user.sub);
  }

  /**
   * GET /reviews/user/:userId
   * Reseñas recibidas por un usuario (perfil público).
   * Accesible por cualquier usuario autenticado.
   */
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  /**
   * GET /reviews/proposal/:proposalId
   * Ambas reseñas de un proyecto (cliente → freelancer y viceversa).
   * Accesible por cualquier usuario autenticado.
   */
  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.reviewsService.findByProposal(proposalId);
  }
}
