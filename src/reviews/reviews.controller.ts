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

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.FREELANCER)
  create(@Body() dto: CreateReviewDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.reviewsService.create(dto, user.sub);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.reviewsService.findByProposal(proposalId);
  }
}
