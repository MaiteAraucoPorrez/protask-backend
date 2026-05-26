import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { Delivery } from './entities/delivery.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { DeliveryFile } from './entities/delivery-file.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, DeliveryFile, Proposal, User]),
    CacheModule.register(),
    AuthModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}