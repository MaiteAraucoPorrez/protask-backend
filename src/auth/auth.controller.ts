import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Máximo 5 intentos por minuto por IP para evitar fuerza bruta
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return this.authService.getMe((req as any).user.sub);
  }
}