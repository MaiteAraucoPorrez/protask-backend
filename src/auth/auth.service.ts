import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import { UserStatus } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<ApiResponse<{ token: string; user: object }>> {
    const response = await this.usersService.create(dto);
    const user = response.data;

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return ApiResponse.success(
      { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      'Usuario registrado exitosamente',
    );
  }

  async login(dto: LoginDto): Promise<ApiResponse<{ token: string; user: object }>> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Credenciales inválidas');

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Tu cuenta está suspendida o desactivada');
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