import { IsUUID } from 'class-validator';

export class CrearDepositoDto {
  @IsUUID()
  proposalId!: string;
}
