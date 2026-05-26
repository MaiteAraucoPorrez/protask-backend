import { Delivery, DeliveryStatus } from '../entities/delivery.entity';
import { DeliveryFile } from '../entities/delivery-file.entity';

export class DeliveryFileResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;

  constructor(file: DeliveryFile) {
    this.id = file.id;
    this.filename = file.filename;
    this.originalName = file.originalName;
    this.mimeType = file.mimeType;
    this.size = file.size;
    this.url = `/uploads/deliveries/${file.filename}`;
    this.uploadedAt = file.uploadedAt;
  }
}

export class DeliveryResponseDto {
  id: string;
  comment: string;
  status: DeliveryStatus;
  revisionComment?: string;
  version: number;
  proposalId: string;
  freelancerId: string;
  freelancerName: string;
  files: DeliveryFileResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  constructor(delivery: Delivery) {
    this.id = delivery.id;
    this.comment = delivery.comment;
    this.status = delivery.status;
    this.revisionComment = delivery.revisionComment;
    this.version = delivery.version;
    this.proposalId = delivery.proposal.id;
    this.freelancerId = delivery.freelancer.id;
    this.freelancerName = delivery.freelancer.name;
    this.files = delivery.files?.map(f => new DeliveryFileResponseDto(f)) || [];
    this.createdAt = delivery.createdAt;
    this.updatedAt = delivery.updatedAt;
  }
}