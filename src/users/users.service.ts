import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import storage = require ('../utils/cloud_storage');
import { UserRoleType } from './dto/change-user-rol.dto';
import { UserRole } from './userRole.entity';


@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(UserRole) private userRolesRepository: Repository<UserRole>, // Añadir el repositorio de UserRole

        
    ) 
    {}

    create(userDTO: CreateUserDTO) {
        const newUser = this.usersRepository.create(userDTO);
        return this.usersRepository.save(newUser);
    }

    findAll() {
        return this.usersRepository.find({
            relations: ['roles']
        });
    }

    async update(idUser: number, userDTO: UpdateUserDTO) {
        const userFound = await this.usersRepository.findOneBy({ idUser });
        if (!userFound) {
            throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
        }

        const updateUser = Object.assign(userFound, userDTO);
        return this.usersRepository.save(updateUser);
    }


    async updateWithImage(idUser: number, userDTO: UpdateUserDTO, image: Express.Multer.File) {
        const url = await storage(image, image.originalname);
        console.log('URL: ', url);

        if (url === undefined || url === null) {
            throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const userFound = await this.usersRepository.findOneBy({ idUser });
        if (!userFound) {
            throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
        }

        userDTO.photoUser = url;
        const updateUser = Object.assign(userFound, userDTO);
        return this.usersRepository.save(updateUser);
    }

    // Método para obtener todos los datos de un usuario, incluidos roles y vehículos
    async getUserDetails(idUser: number): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { idUser },
            relations: ['userRoles', 'userRoles.role', 'userVehicles', 'userVehicles.vehicle'],
        });
    
        if (!user) {
            throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
        }
    
        // Retorna los datos del usuario
        return {
            idUser: user.idUser,
            name: user.name,
            lastName: user.lastName,
            studentFile: user.studentFile,
            email: user.email,
            phone: user.phone,
            dni: user.dni,
            address: user.address,
            contactPhone: user.contactPhone,
            contactName: user.contactName,
            contactLastName: user.contactLastName,
            photoUser: user.photoUser,
            roles: user.userRoles.map(userRole => ({
                idRole: userRole.role.idRole,
                name: userRole.role.name,
                status: userRole.status,
                active: userRole.role.active,
                route: userRole.role.route,
            })),
            vehicle: user.userVehicles.map(userVehicle => ({
                idVehicle: userVehicle.vehicle.idVehicle,
                brand: userVehicle.vehicle.brand,
                model: userVehicle.vehicle.model,
                color: userVehicle.vehicle.color,
                year: userVehicle.vehicle.year,
                patent: userVehicle.vehicle.patent,
            }))
        };
    }
    

    async changeUserRole(idUser: number, idRole: UserRoleType): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { idUser },
            relations: ['userRoles', 'userRoles.role'],
        });
    
        if (!user) {
            throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
        }
    
        for (const userRole of user.userRoles) {
            userRole.status = (userRole.role.idRole === idRole);
            await this.userRolesRepository.save(userRole);
        }
    
        // Recargar las relaciones para asegurarse de que los datos están actualizados
        const updatedUser = await this.usersRepository.findOne({
            where: { idUser },
            relations: ['userRoles', 'userRoles.role', 'userVehicles', 'userVehicles.vehicle'],
        });
    
        if (!updatedUser) {
            throw new HttpException('El usuario no existe después de la actualización', HttpStatus.NOT_FOUND);
        }
    
        // Retorna los datos del usuario
        return {
            idUser: updatedUser.idUser,
            name: updatedUser.name,
            lastName: updatedUser.lastName,
            studentFile: updatedUser.studentFile,
            email: updatedUser.email,
            phone: updatedUser.phone,
            dni: updatedUser.dni,
            address: updatedUser.address,
            contactPhone: updatedUser.contactPhone,
            contactName: updatedUser.contactName,
            contactLastName: updatedUser.contactLastName,
            photoUser: updatedUser.photoUser,
            roles: updatedUser.userRoles.map(userRole => ({
                idRole: userRole.role.idRole,
                name: userRole.role.name,
                status: userRole.status,
                active: userRole.role.active,
                route: userRole.role.route,
            })),
            vehicle: updatedUser.userVehicles.map(userVehicle => ({
                idVehicle: userVehicle.vehicle.idVehicle,
                brand: userVehicle.vehicle.brand,
                model: userVehicle.vehicle.model,
                color: userVehicle.vehicle.color,
                year: userVehicle.vehicle.year,
                patent: userVehicle.vehicle.patent,
            }))
        };
    }
    
    
}
