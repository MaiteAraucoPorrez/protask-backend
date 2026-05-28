import { IsString, IsOptional } from 'class-validator';

/**
 * Body que envía el freelancer al marcar un hito como entregado.
 * El comentario es opcional pero recomendado.
 */
export class SubmitMilestoneDto {
  @IsString()
  @IsOptional()
  submissionComment?: string;
}
