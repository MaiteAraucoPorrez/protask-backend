import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReviewDto {
  /** ID de la propuesta asociada al proyecto terminado */
  @IsUUID()
  proposalId!: string;

  /** Puntuación entre 1 y 5 */
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  /** Comentario opcional (máx 1000 caracteres) */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
