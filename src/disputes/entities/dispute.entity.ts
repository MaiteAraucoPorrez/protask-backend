import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';
import { User } from '../../users/entities/user.entity';
import { EscrowDeposit } from '../../escrow/entities/escrow-deposit.entity';

export enum DisputeStatus {
  PENDING = 'pendiente',
  RESOLVED = 'resuelto',
  REJECTED = 'rechazado',
}

export enum DisputeResolution {
  RELEASE_PAYMENT = 'liberar_pago',
  REFUND = 'reembolsar',
  REQUEST_CORRECTION = 'solicitar_correccion',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  reason!: string;

  @Column('text')
  description!: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
  status!: DisputeStatus;

  @Column({ type: 'enum', enum: DisputeResolution, nullable: true })
  resolution?: DisputeResolution;

  @Column({ nullable: true })
  resolutionComment?: string;

  @ManyToOne(() => Proposal)
  proposal!: Proposal;

  @ManyToOne(() => User)
  client!: User;

  @ManyToOne(() => User)
  freelancer!: User;

  @ManyToOne(() => EscrowDeposit)
  escrowDeposit!: EscrowDeposit;

  @Column({ type: 'simple-array', nullable: true })
  evidencePaths?: string[];

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}