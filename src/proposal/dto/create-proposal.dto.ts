import { IsString, IsNumber, IsNotEmpty, Min, IsEnum } from 'class-validator';
import { ExperienceLevel } from '../entities/proposal.entity';

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

  @IsEnum(ExperienceLevel)
  @IsNotEmpty()
  experienceLevel!: ExperienceLevel;

  @IsString()
  @IsNotEmpty()
  jobDescription!: string;


}