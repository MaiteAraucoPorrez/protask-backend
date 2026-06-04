import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';
import { User } from '../../users/entities/user.entity';

export enum EscrowEstado {
  RETENIDO = 'retenido',
  LIBERADO = 'liberado',
  REEMBOLSADO = 'reembolsado',
}

export enum ProjectTipoPago {
  TARJETA_CREDITO = 'tarjeta_credito',
  QR = 'qr',
  TRANSFERENCIA_BANCARIA = 'transferencia_bancaria',
}

@Entity('escrow_deposits')
export class EscrowDeposit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Proposal)
  @JoinColumn()
  @Index({ unique: true })
  proposal!: Proposal;

  @ManyToOne(() => User)
  @Index()
  cliente!: User;

  @ManyToOne(() => User)
  @Index()
  freelancer!: User;

  @Column('decimal', { precision: 10, scale: 2 })
  monto!: number;

  @Column({ type: 'enum', enum: EscrowEstado, default: EscrowEstado.RETENIDO })
  @Index()
  estado!: EscrowEstado;

  @Column({ type: 'enum', enum: ProjectTipoPago, nullable: true })
  @Index()
  tipoPago!: ProjectTipoPago;

  @Column({ nullable: true })
  liberadoEn?: Date;

  @Column({ nullable: true })
  reembolsadoEn?: Date;

  @CreateDateColumn()
  depositadoEn!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
