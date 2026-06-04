import { IsEnum, IsUUID } from 'class-validator';
import { ProjectTipoPago } from '../entities/escrow-deposit.entity';

export class CrearDepositoDto {
  @IsUUID()
  proposalId!: string;

  @IsEnum(ProjectTipoPago, {
    message: `tipoPago debe ser uno de: ${Object.values(ProjectTipoPago).join(', ')}`,
  })
  tipoPago!: ProjectTipoPago;
}
