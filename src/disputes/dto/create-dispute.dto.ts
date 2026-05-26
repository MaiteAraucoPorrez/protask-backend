import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';

export enum DisputeResolutionDesired {
  REFUND_FULL = 'reembolso_completo',
  REFUND_PARTIAL = 'reembolso_parcial',
  REQUEST_CORRECTION = 'solicitar_correccion',
}

export class CreateDisputeDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(2000)
  description!: string;

  @IsEnum(DisputeResolutionDesired)
  @IsNotEmpty()
  desiredResolution!: DisputeResolutionDesired;
}