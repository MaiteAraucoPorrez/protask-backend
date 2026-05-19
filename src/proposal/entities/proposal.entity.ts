import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  offeredPrice!: number;

  @Column()
  estimatedDays!: number;

  @Column('text')
  description!: string;

  @Column({ default: 'pending' })
  status!: string;

  @ManyToOne(() => Project)
  project!: Project;

  @ManyToOne(() => User)
  freelancer!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}