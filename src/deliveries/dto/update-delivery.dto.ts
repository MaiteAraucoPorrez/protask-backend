import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryDto } from './create-delivery.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DeliveryStatus } from '../entities/delivery.entity';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  revisionComment?: string;
}