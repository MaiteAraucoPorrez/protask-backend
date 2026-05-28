import { Milestone, MilestoneStatus } from '../entities/milestone.entity';

export class MilestoneResponseDto {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: Date;
  order: number;
  status: MilestoneStatus;
  proposalId: string;
  submissionComment?: string;
  revisionComment?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(m: Milestone) {
    this.id = m.id;
    this.title = m.title;
    this.description = m.description;
    this.amount = Number(m.amount);
    this.dueDate = m.dueDate;
    this.order = m.order;
    this.status = m.status;
    this.proposalId = m.proposal?.id;
    this.submissionComment = m.submissionComment;
    this.revisionComment = m.revisionComment;
    this.submittedAt = m.submittedAt;
    this.approvedAt = m.approvedAt;
    this.createdAt = m.createdAt;
    this.updatedAt = m.updatedAt;
  }
}
