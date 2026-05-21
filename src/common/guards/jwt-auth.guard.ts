import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);

        console.log('=== JWT GUARD DEBUG ===');
        console.log('Token extraído:', token ? `${token.substring(0, 50)}...` : 'NO TOKEN');

        if (!token) {
            console.log('No se encontró token');
            throw new UnauthorizedException('Token no proporcionado');
        }

        try {
            const payload: JwtPayload = await this.jwtService.verifyAsync(token);
            console.log('Payload decodificado:', payload);
            console.log('  - sub (user id):', payload.sub);
            console.log('  - email:', payload.email);
            console.log('  - role:', payload.role);

            (request as any).user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };
            
            console.log('Usuario asignado a req.user:', (request as any).user);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log('Error verificando token:', message);
            throw new UnauthorizedException('Token inválido o expirado');
        }

        return true;
    }

    private extractToken(request: Request): string | null {
        const authHeader = request.headers.authorization;
        console.log('Authorization header:', authHeader ? 'PRESENTE' : 'AUSENTE');
        
        if (!authHeader) return null;
        
        const [type, token] = authHeader.split(' ');
        console.log('Tipo:', type);
        
        return type === 'Bearer' ? token : null;
    }
}