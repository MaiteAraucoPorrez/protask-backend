import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum KycStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}

@Entity('kyc_verificaciones')
export class KycVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDIENTE,
  })
  status!: KycStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dniFrentePath?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dniDorsoPath?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  selfieConDniPath?: string | null;

  @Column({ type: 'text', nullable: true })
  motivoRechazo?: string | null;

  @Column({ type: 'varchar', nullable: true })
  revisadoPorId?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  revisadoEn?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  enviadoEn?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
