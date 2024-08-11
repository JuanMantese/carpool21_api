import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { create } from 'domain';
import { CreateRoleDTO } from './dto/create-role.dto';

@Injectable()
export class RolesService {

    constructor(@InjectRepository(Role) private rolesRepository: Repository<Role>){}

    create(role: CreateRoleDTO){
        const newRole = this.rolesRepository.create(role);
        return this.rolesRepository.save(newRole);
    }

    async findOne(idRole: string): Promise<Role> {
        return this.rolesRepository.findOne({ where: { idRole: idRole } });
    }
}
