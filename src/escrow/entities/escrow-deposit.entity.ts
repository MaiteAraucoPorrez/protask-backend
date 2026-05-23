import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';
import { User } from '../../users/entities/user.entity';

export enum EscrowEstado {
  RETENIDO = 'retenido',
  LIBERADO = 'liberado',
  REEMBOLSADO = 'reembolsado',
}

@Entity('escrow_deposits')
export class EscrowDeposit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Proposal)
  @JoinColumn()
  proposal!: Proposal;

  @ManyToOne(() => User)
  cliente!: User;

  @ManyToOne(() => User)
  freelancer!: User;

  @Column('decimal', { precision: 10, scale: 2 })
  monto!: number;

  @Column({ type: 'enum', enum: EscrowEstado, default: EscrowEstado.RETENIDO })
  estado!: EscrowEstado;

  @Column({ nullable: true })
  liberadoEn?: Date;

  @Column({ nullable: true })
  reembolsadoEn?: Date;

  @CreateDateColumn()
  depositadoEn!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
