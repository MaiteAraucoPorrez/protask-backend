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
  /** UUID de la propuesta aceptada a la que pertenece este hito */
  @IsUUID()
  @IsNotEmpty()
  proposalId!: string;

  /** Título descriptivo del hito (máx. 150 caracteres) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  /** Descripción de entregables esperados (opcional) */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Monto asignado a este hito.
   * La suma de todos los hitos de una propuesta debe ser <= offeredPrice.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  /**
   * Fecha límite de entrega (ISO 8601: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ)
   */
  @IsDateString()
  dueDate!: string;

  /**
   * Posición/orden del hito dentro del proyecto (inicia en 1).
   * Si no se envía, el servicio asigna automáticamente el siguiente número.
   */
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  order?: number;
}
