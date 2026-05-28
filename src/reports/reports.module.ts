import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportsController } from './reports.controller';
import { EscrowDeposit } from '../escrow/entities/escrow-deposit.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { AuthModule } from '../auth/auth.module';
import { ReportsService } from './reports.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([EscrowDeposit, User, Project]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}