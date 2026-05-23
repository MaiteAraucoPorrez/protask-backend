import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150, { message: 'El email no puede exceder 150 caracteres' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64, { message: 'La contraseña no puede exceder 64 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password!: string;

  @IsIn([UserRole.CLIENT, UserRole.FREELANCER], {
    message: 'El rol debe ser: cliente o freelancer',
  })
  role!: UserRole;
}