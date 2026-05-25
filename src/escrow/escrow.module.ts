import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { EscrowDeposit } from './entities/escrow-deposit.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscrowDeposit, Proposal]),
    CacheModule.register(),
    AuthModule,
  ],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}