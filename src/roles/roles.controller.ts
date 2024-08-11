import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { create } from 'domain';
import { CreateRoleDTO } from './dto/create-role.dto';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';

@Controller('roles')
export class RolesController {
    constructor(private rolesServices: RolesService) {}

    //@HasRoles(JwtRole.ADMIN)
    //@UseGuards(JwtAuthGuard,JwtRolesGuard)
    @Post('create') //http://localhost:3000/roles/create -> POST
    create(@Body() role: CreateRoleDTO){
        return this.rolesServices.create(role);
    }

    @Get('findOne') //http://localhost:3000/roles/findOne -> GET
    async findOne(@Body('idRole') idRole: string){
        return await this.rolesServices.findOne(idRole);
    }
}
