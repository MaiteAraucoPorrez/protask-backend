import { Review, ReviewerRole } from '../entities/review.entity';

export class ReviewUserDto {
  id: string;
  name: string;
  avatarUrl?: string;

  constructor(user: { id: string; name: string; avatarUrl?: string }) {
    this.id = user.id;
    this.name = user.name;
    this.avatarUrl = user.avatarUrl;
  }
}

export class ReviewResponseDto {
  id: string;
  proposalId: string;
  reviewer: ReviewUserDto;
  reviewed: ReviewUserDto;
  rating: number;
  comment?: string;
  reviewerRole: ReviewerRole;
  createdAt: Date;

  constructor(review: Review) {
    this.id = review.id;
    this.proposalId = review.proposal?.id ?? (review as any).proposalId;
    this.reviewer = new ReviewUserDto(review.reviewer);
    this.reviewed = new ReviewUserDto(review.reviewed);
    this.rating = review.rating;
    this.comment = review.comment;
    this.reviewerRole = review.reviewerRole;
    this.createdAt = review.createdAt;
  }
}
