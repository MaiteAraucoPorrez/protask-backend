import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  title!: string;

  @Column('text')
  description!  : string;

  @Column()
  @Index() 
  category!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  budget!: number;

  @Column({ name: 'deadline_days' })
  deadlineDays!: number;

  @Column({ default: 'open' })
  @Index() 
  status!: string; // open, in_progress, completed, cancelled

  @ManyToOne(() => User, { eager: true })
  @Index() 
  client!: User;

  @CreateDateColumn()
  @Index() 
  createdAt!: Date;

  @Column({ default: false })
  isCorporate!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}