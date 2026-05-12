import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    currentPassword!: string;

    @IsString()
    @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
    @MaxLength(64)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
            'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    })
    newPassword!: string;
}
