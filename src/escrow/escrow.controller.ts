import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { EscrowService } from './escrow.service';
import { CrearDepositoDto } from './dto/crear-deposito.dto';
import { EscrowQueryDto } from './dto/escrow-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('depositar')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  depositar(@Body() dto: CrearDepositoDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.escrowService.depositar(dto, user.sub);
  }

  @Get('mis-depositos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  misDepositos(@Req() req: Request, @Query() query: EscrowQueryDto) {
    const user = (req as any).user;
    return this.escrowService.misDepositos(user.sub, query);
  }

  @Get('mis-fondos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  misFondos(@Req() req: Request, @Query() query: EscrowQueryDto) {
    const user = (req as any).user;
    return this.escrowService.misFondos(user.sub, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.escrowService.findOne(id, user.sub);
  }
}