import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password!: string;

  @IsEnum(UserRole, {
    message: 'El rol debe ser: cliente, freelancer o administrador',
  })
  role!: UserRole;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s\-\+\(\)]+$/, {
    message:
      'El teléfono solo puede contener dígitos y los caracteres: + - ( )',
  })
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La URL del avatar no es válida' })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La tarifa por hora debe ser un número' })
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString({ each: true })
  skills?: string[];
}
