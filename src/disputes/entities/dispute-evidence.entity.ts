import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Dispute } from './dispute.entity';

@Entity('dispute_evidences')
export class DisputeEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  mimeType!: string;

  @Column()
  size!: number;

  @Column()
  path!: string;

  @ManyToOne(() => Dispute, (dispute) => dispute.evidencePaths, { onDelete: 'CASCADE' })
  dispute!: Dispute;

  @CreateDateColumn()
  uploadedAt!: Date;
}