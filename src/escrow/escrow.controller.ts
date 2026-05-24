import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { EscrowService } from './escrow.service';
import { CrearDepositoDto } from './dto/crear-deposito.dto';
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
    return this.escrowService.depositar(dto, (req as any).user.id);
  }

  @Get('mis-depositos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT)
  misDepositos(@Req() req: Request) {
    return this.escrowService.misDepositos((req as any).user.id);
  }

  @Get('mis-fondos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FREELANCER)
  misFondos(@Req() req: Request) {
    return this.escrowService.misFondos((req as any).user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.escrowService.findOne(id, (req as any).user.id);
  }
}
