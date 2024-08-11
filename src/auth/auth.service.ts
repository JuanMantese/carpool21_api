import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RegisterAuthDTO } from './dto/register-auth.dto';
import { User } from 'src/users/users.entity';
import { Repository, In } from 'typeorm';
import { compare } from 'bcrypt';
import { LoginAuthDTO } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/roles/role.entity';
import { last } from 'rxjs';
import { create } from 'domain';
import { UserVehicle } from 'src/users/userVehicles.entity';
import { UserRole } from 'src/users/userRole.entity';


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Role) private rolesRepository: Repository<Role>,
        @InjectRepository(UserRole) private userByRolesRepository: Repository<UserRole>,
        private jwtService: JwtService,
    ) {}

    // Método para registrar un nuevo usuario
    async register(userDTO: RegisterAuthDTO) {
        const { email, studentFile } = userDTO;

        // Verifica si el email ya está registrado
        const emailExists = await this.usersRepository.findOneBy({ email });
        if (emailExists) {
            throw new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
        }

        // Verifica si el legajo de estudiante ya está registrado
        const studentExists = await this.usersRepository.findOneBy({ studentFile });
        if (studentExists) {
            throw new HttpException('El legajo de alumno ya está registrado', HttpStatus.CONFLICT);
        }

        // Crea y guarda el nuevo usuario
        const newUser = this.usersRepository.create(userDTO);
        const userSaved = await this.usersRepository.save(newUser);

        // Asigna roles al usuario, por defecto 'PASSENGER' si no se especifica
        let rolesId = userDTO.rolesId ?? ['PASSENGER'];

        if (!rolesId.includes('PASSENGER')) {
            rolesId.push('PASSENGER');
        }

        const roles = await this.rolesRepository.findBy({ idRole: In(rolesId) });

        // Guarda los roles del usuario en la tabla intermedia UserByRoles
        for (const role of roles) {
            const userRole = this.userByRolesRepository.create({
                user: userSaved,
                role,
                createDate: new Date(),
                status: true,
                isActive: true,
            });
            await this.userByRolesRepository.save(userRole);
        }

        // Genera el token JWT
        const rolesString = roles.map(role => role.idRole);
        const payload = { 
            idUser: userSaved.idUser, 
            name: userSaved.name, 
            lastName: userSaved.lastName, 
            roles: rolesString 
        };
        const token = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload);


        // Retorna los datos del usuario y el token
        const data = {
            user: userSaved,
            token: token,
            refreshToken: refreshToken
        };
        delete data.user.password; // Elimina la contraseña del objeto de respuesta

        return data;
    }

    // Método para iniciar sesión
    async login(loginDTO: LoginAuthDTO) {
        const { email, password } = loginDTO;

        // Busca el usuario por email y obtiene sus roles
        const userFound = await this.usersRepository.findOne({
            where: { email },
            relations: ['userRoles', 'userRoles.role',  'userVehicles','userVehicles.vehicle'],
        });

        if (!userFound) {
            throw new HttpException('El email no está registrado', HttpStatus.NOT_FOUND);
        }

        // Verifica si la contraseña es correcta
        const isPasswordValid = await compare(password, userFound.password);
        if (!isPasswordValid) {
            throw new HttpException('La contraseña es incorrecta', HttpStatus.FORBIDDEN);
        }

        // Obtiene los IDs de los roles del usuario
        const rolesId = userFound.userRoles.map(userRole => userRole.role.idRole);

        // Genera el token JWT
        const payload = { idUser: userFound.idUser, name: userFound.name, lastName: userFound.lastName, roles: rolesId };
        const token = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload);
        

        const validVehicles = userFound.userVehicles.filter(userVehicle => userVehicle.vehicle);


        // Retorna los datos del usuario y el token
        const data = {
            user: {
                idUser: userFound.idUser,
                name: userFound.name,
                lastName: userFound.lastName,
                email: userFound.email,
                phone: userFound.phone,
                dni: userFound.dni,
                address: userFound.address,
                contactPhone: userFound.contactPhone,
                contactName: userFound.contactName,
                contactLastName: userFound.contactLastName,
                photoUser: userFound.photoUser,
                roles: userFound.userRoles.map(userRole => ({
                    idRole: userRole.role.idRole,
                    name: userRole.role.name,
                    status: userRole.status,
                    isActive: userRole.isActive,
                    route: userRole.role.route,
                })),
                vehicle: validVehicles.map(userVehicle => ({
                    idVehicle: userVehicle.vehicle.idVehicle,
                    brand: userVehicle.vehicle.brand,
                    model: userVehicle.vehicle.model,
                    color: userVehicle.vehicle.color,
                    year: userVehicle.vehicle.year,
                    patent: userVehicle.vehicle.patent,
                })),
            },
            token: token,
            refreshToken: refreshToken,
        };
        return data;
    }


}
