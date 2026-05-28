import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Proposal } from '../../proposal/entities/proposal.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** One room per accepted proposal */
  @OneToOne(() => Proposal)
  @JoinColumn()
  @Index({ unique: true })
  proposal!: Proposal;

  @ManyToOne(() => User, { eager: true })
  @Index()
  client!: User;

  @ManyToOne(() => User, { eager: true })
  @Index()
  freelancer!: User;

  /** Cached preview for room list */
  @Column({ type: 'text', nullable: true })
  lastMessage?: string;

  @Column({ nullable: true })
  lastMessageAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
