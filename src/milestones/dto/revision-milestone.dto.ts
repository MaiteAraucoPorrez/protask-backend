import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Body que envía el cliente al solicitar una revisión de un hito.
 * El comentario es obligatorio para que el freelancer sepa qué corregir.
 */
export class RevisionMilestoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar qué se debe corregir en el hito' })
  revisionComment!: string;
}
