import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

export function Roles(...roles: UserRole[]): MethodDecorator & ClassDecorator {
    return (target: any, key?: string | symbol, descriptor?: any) => {
        const metadataTarget = descriptor ? descriptor.value : target;
        Reflect.defineMetadata(ROLES_KEY, roles, metadataTarget);
        return descriptor ?? target;
    };
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        console.log('=== ROLES GUARD DEBUG ===');
        console.log('Roles requeridos:', requiredRoles);

        if (!requiredRoles || requiredRoles.length === 0) {
            console.log(' No se requieren roles específicos');
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        
        console.log('Usuario en request:', user);
        console.log('  - id:', user?.id);
        console.log('  - email:', user?.email);
        console.log('  - role:', user?.role);

        if (!user) {
            console.log('No hay usuario en la request');
            throw new ForbiddenException('No hay usuario autenticado');
        }

        if (!requiredRoles.includes(user?.role)) {
            console.log(`Rol ${user?.role} no está en los roles requeridos: ${requiredRoles}`);
            throw new ForbiddenException(
                'No tienes permisos para acceder a este recurso',
            );
        }

        console.log('Rol autorizado');
        return true;
    }
}