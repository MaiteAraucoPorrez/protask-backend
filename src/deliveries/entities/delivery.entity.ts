import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryFile } from './delivery-file.entity';

export enum DeliveryStatus {
  PENDING = 'pendiente_revision',
  APPROVED = 'aprobado',
  REJECTED = 'rechazado',
  REVISION_REQUESTED = 'revision_solicitada',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  comment!: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status!: DeliveryStatus;

  @Column({ nullable: true })
  revisionComment?: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @ManyToOne(() => Proposal)
  proposal!: Proposal;

  @ManyToOne(() => User)
  freelancer!: User;

  @OneToMany(() => DeliveryFile, (file) => file.delivery, { cascade: true })
  files!: DeliveryFile[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  
  @Column({ type: 'int', default: 0 })
  revisionCount!: number;


}