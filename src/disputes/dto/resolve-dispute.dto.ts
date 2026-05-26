import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { DisputeResolution } from '../entities/dispute.entity';

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  @IsNotEmpty()
  resolution!: DisputeResolution;

  @IsString()
  @IsOptional()
  resolutionComment?: string;
}