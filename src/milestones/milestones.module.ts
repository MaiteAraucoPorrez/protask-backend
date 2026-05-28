import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Milestone } from './entities/milestone.entity';
import { Proposal } from '../proposal/entities/proposal.entity';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Milestone,
      Proposal,   // necesario para validar propuesta aceptada y roles
    ]),
    AuthModule,   // provee JwtModule → JwtService requerido por JwtAuthGuard
  ],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService], // disponible si otros módulos lo necesitan
})
export class MilestonesModule {}
