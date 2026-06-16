import { EscrowModule } from '../escrow/escrow.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { Delivery } from './entities/delivery.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { DeliveryFile } from './entities/delivery-file.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, DeliveryFile, Proposal, User, Project]),
    CacheModule.register(),
    AuthModule,
    EscrowModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  
  exports: [DeliveriesService],
})
export class DeliveriesModule {}