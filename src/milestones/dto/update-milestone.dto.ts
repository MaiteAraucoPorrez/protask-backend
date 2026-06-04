import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  order?: number;
}
