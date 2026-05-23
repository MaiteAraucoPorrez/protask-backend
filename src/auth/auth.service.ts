import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import { UserStatus } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<ApiResponse<{ user: Pick<UserResponseDto, 'id' | 'name' | 'email' | 'role'> }>> {
    const response = await this.usersService.create(dto);
    const user = response.data;

    return ApiResponse.success(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      'Usuario registrado exitosamente. Verifica tu correo para activar tu cuenta.',
    );
  }

  async login(dto: LoginDto): Promise<ApiResponse<{ token: string; user: Pick<UserResponseDto, 'id' | 'name' | 'email' | 'role'> }>> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Credenciales inválidas');

    if (user.status !== UserStatus.ACTIVE) {
      const messages: Record<string, string> = {
        [UserStatus.PENDING_VERIFICATION]: 'Tu cuenta aún no ha sido verificada. Revisa tu correo.',
        [UserStatus.SUSPENDED]: 'Tu cuenta está suspendida. Contacta al administrador.',
        [UserStatus.INACTIVE]: 'Tu cuenta está desactivada.',
      };
      throw new UnauthorizedException(messages[user.status] ?? 'Tu cuenta no está activa.');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateLastLogin(user.id);

    return ApiResponse.success(
      { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      'Inicio de sesión exitoso',
    );
  }

  async getMe(userId: string) {
    return this.usersService.findOne(userId);
  }
}