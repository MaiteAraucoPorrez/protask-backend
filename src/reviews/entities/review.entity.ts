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

/**
 * HU-F11: Cliente califica al freelancer
 * HU-F12: Freelancer califica al cliente
 *
 * Constraint único: un mismo usuario no puede dejar dos reseñas
 * para la misma propuesta.
 */
@Entity('reviews')
@Unique(['proposal', 'reviewer'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Propuesta a la que pertenece esta reseña */
  @ManyToOne(() => Proposal, { eager: false })
  @Index()
  proposal!: Proposal;

  /** Quien escribe la reseña */
  @ManyToOne(() => User, { eager: true })
  @Index()
  reviewer!: User;

  /** Quien recibe la reseña */
  @ManyToOne(() => User, { eager: true })
  @Index()
  reviewed!: User;

  /** Puntuación del 1 al 5 */
  @Column({ type: 'int' })
  rating!: number;

  /** Comentario opcional */
  @Column({ type: 'text', nullable: true })
  comment?: string;

  /** Indica quién dejó la reseña para filtros rápidos */
  @Column({ type: 'enum', enum: ReviewerRole })
  @Index()
  reviewerRole!: ReviewerRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
