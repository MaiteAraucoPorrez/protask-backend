import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password', 'role'] as const),
) {
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}
