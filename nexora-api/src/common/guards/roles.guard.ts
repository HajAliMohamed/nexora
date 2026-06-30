import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyMember } from '../../agencies/entities/agency-member.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(ROLES_KEY, roles, target);
    return target;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AgencyMember)
    private readonly memberRepo: Repository<AgencyMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException();

    const agencyId = request.params.agencyId || request.body?.agencyId;
    if (!agencyId) return true;

    const member = await this.memberRepo.findOne({
      where: { agencyId, userId: user.id },
    });

    if (!member) throw new ForbiddenException('Vous n\'êtes pas membre de cette agence');
    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Vous n\'avez pas les permissions nécessaires');
    }

    (request as any).agencyMember = member;
    return true;
  }
}
