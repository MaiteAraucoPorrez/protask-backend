import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMilestoneDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  order?: number;
}
