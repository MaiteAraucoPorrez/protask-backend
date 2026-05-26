import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Delivery } from './delivery.entity';

@Entity('delivery_files')
export class DeliveryFile {
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

  @ManyToOne(() => Delivery, (delivery) => delivery.files, { onDelete: 'CASCADE' })
  delivery!: Delivery;

  @CreateDateColumn()
  uploadedAt!: Date;
}