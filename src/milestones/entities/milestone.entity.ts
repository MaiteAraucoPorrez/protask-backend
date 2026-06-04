import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';

export enum MilestoneStatus {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  ENTREGADO = 'entregado',
  APROBADO = 'aprobado',
  REVISION_SOLICITADA = 'revision_solicitada',
}

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'int', default: 1 })
  order!: number;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDIENTE,
  })
  @Index()
  status!: MilestoneStatus;

  @ManyToOne(() => Proposal, { eager: false, onDelete: 'CASCADE' })
  @Index()
  proposal!: Proposal;

  @Column({ type: 'text', nullable: true })
  submissionComment?: string;

  @Column({ type: 'text', nullable: true })
  revisionComment?: string;

  @Column({ nullable: true })
  submittedAt?: Date;

  @Column({ nullable: true })
  approvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
