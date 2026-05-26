import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateDeliveryDto {
  @IsUUID()
  @IsNotEmpty()
  proposalId!: string;

  @IsString()
  @IsNotEmpty()
  comment!: string;
}