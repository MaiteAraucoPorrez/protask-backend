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

/**
 * HU-F13: Gestión de hitos
 *
 * Permite dividir un proyecto (propuesta aceptada) en fases/hitos
 * con pagos y entregas parciales por etapa.
 *
 * Flujo de estado:
 *   pendiente → en_progreso → entregado → aprobado
 *                                       → revision_solicitada → entregado → ...
 */
@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Título corto del hito */
  @Column({ length: 150 })
  title!: string;

  /** Descripción detallada de qué debe entregarse en este hito */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Monto asignado a este hito (fracción del precio acordado) */
  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  /** Fecha límite de entrega del hito */
  @Column({ type: 'date' })
  dueDate!: Date;

  /**
   * Orden de aparición (1, 2, 3 …)
   * Permite que el frontend los muestre en secuencia lógica.
   */
  @Column({ type: 'int', default: 1 })
  order!: number;

  /** Estado actual del hito */
  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDIENTE,
  })
  @Index()
  status!: MilestoneStatus;

  /** Propuesta (contrato) a la que pertenece este hito */
  @ManyToOne(() => Proposal, { eager: false, onDelete: 'CASCADE' })
  @Index()
  proposal!: Proposal;

  /** Comentario del freelancer al momento de entregar */
  @Column({ type: 'text', nullable: true })
  submissionComment?: string;

  /** Comentario del cliente al pedir revisión */
  @Column({ type: 'text', nullable: true })
  revisionComment?: string;

  /** Fecha en que el freelancer marcó como entregado */
  @Column({ nullable: true })
  submittedAt?: Date;

  /** Fecha en que el cliente aprobó el hito */
  @Column({ nullable: true })
  approvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
