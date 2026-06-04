import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  CLIENT = 'cliente',
  FREELANCER = 'freelancer',
  ADMIN = 'administrador',
}

export enum UserStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo',
  SUSPENDED = 'suspendido',
  PENDING_VERIFICATION = 'pendiente_verificacion',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true, length: 150 })
  @Index()
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  @Index()
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  @Index() 
  status!: UserStatus;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 500, nullable: true })
  bio?: string;

  @Column({ length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ length: 100, nullable: true })
  location?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate?: number;

  @Column({ type: 'simple-array', nullable: true })
  skills?: string[];

  @Column({ type: 'simple-array', nullable: true })
  portfolioFiles?: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ default: 0 })
  totalReviews!: number;

  @Column({ default: 0 })
  completedProjects!: number;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
