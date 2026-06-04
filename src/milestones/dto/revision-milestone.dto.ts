import { IsString, IsNotEmpty } from 'class-validator';

export class RevisionMilestoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar qué se debe corregir en el hito' })
  revisionComment!: string;
}
