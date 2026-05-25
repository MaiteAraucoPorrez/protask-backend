import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        // Register JwtModule here directly (same config as AuthModule) to avoid
        // circular dependency: AuthModule → UsersModule → AuthModule
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
            }),
        }),
        CacheModule.register(), // ← Agregar esta línea
    ],
    providers: [
        UsersService,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
    ],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule { }