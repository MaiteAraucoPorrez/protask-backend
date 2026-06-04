import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Proposal } from '../../proposal/entities/proposal.entity';

export enum ReviewerRole {
  CLIENT = 'cliente',
  FREELANCER = 'freelancer',
}

@Entity('reviews')
@Unique(['proposal', 'reviewer'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Proposal, { eager: false })
  @Index()
  proposal!: Proposal;

  @ManyToOne(() => User, { eager: true })
  @Index()
  reviewer!: User;

  @ManyToOne(() => User, { eager: true })
  @Index()
  reviewed!: User;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'enum', enum: ReviewerRole })
  @Index()
  reviewerRole!: ReviewerRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
