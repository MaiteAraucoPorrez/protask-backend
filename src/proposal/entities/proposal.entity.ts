import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, } from 'typeorm';
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
  @Index() 
  status!: string;

  @ManyToOne(() => Project)
  @Index() 
  project!: Project;

  @ManyToOne(() => User)
  @Index() 
  freelancer!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}