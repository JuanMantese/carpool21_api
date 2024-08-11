import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtRole } from './jwt-role';

@Injectable()
export class JwtRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<JwtRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.userRoles) {
      throw new ForbiddenException('Access Denied');
    }

    // Filtrar los roles con status true
    const statusRoles = user.userRoles.filter(userRole => userRole.status);

    // Verificar si alguno de los roles requeridos coincide con los roles con status true del usuario
    return requiredRoles.some((role) => statusRoles.some(userRole => userRole.role.idRole === role));
  }
}