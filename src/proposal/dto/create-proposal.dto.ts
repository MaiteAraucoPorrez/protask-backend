import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreateProposalDto {
  @IsNumber()
  @Min(1)
  offeredPrice!: number;

  @IsNumber()
  @Min(1)
  estimatedDays!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;
}