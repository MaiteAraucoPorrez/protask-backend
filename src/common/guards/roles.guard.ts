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

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!requiredRoles.includes(user?.role)) {
            throw new ForbiddenException(
                'No tienes permisos para acceder a este recurso',
            );
        }

        return true;
    }
}
