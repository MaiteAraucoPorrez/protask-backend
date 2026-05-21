import { IsString, MaxLength, MinLength } from 'class-validator';

export class RechazarKycDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  motivoRechazo!: string;
}
