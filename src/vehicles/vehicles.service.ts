import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from './vehicles.entity';
import { Repository } from 'typeorm';
import { CreateVehicleDTO } from './dto/create-vehicle.dto';
import { User } from 'src/users/users.entity';
import { RolesService } from 'src/roles/roles.service';
import { UpdateVehicleDTO } from './dto/update-vehicle.dto';
import { UserVehicle } from 'src/users/userVehicles.entity';
import { UserRole } from 'src/users/userRole.entity';
import { Role } from 'src/roles/role.entity';

@Injectable()
export class VehiclesService {
    constructor(
        @InjectRepository(Vehicle) private vehiclesRepository: Repository<Vehicle>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(UserVehicle) private userVehicleRepository: Repository<UserVehicle>,
        @InjectRepository(UserRole) private userRoleRepository: Repository<UserRole>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        private readonly rolesService: RolesService,
    ) {}

    async create(createVehicleDTO: CreateVehicleDTO, idUser: number): Promise<any> { // Cambia el tipo de retorno a 'any'
        // Buscar el usuario
        const user = await this.userRepository.findOne({ where: { idUser }, relations: ['userVehicles'] });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }
    
        // Buscar el vehículo por greenCard
        let vehicle = await this.vehiclesRepository.findOne({ where: { greenCard: createVehicleDTO.greenCard } });
    
        if (!vehicle) {
            // Crear y guardar el vehículo
            vehicle = this.vehiclesRepository.create(createVehicleDTO);
            vehicle = await this.vehiclesRepository.save(vehicle);
        }
    
        // Verificar si el vehículo ya está asociado al usuario
        let userVehicle = await this.userVehicleRepository.findOne({ where: { user, vehicle } });
        if (!userVehicle) {
            userVehicle = this.userVehicleRepository.create({
                user,
                vehicle,
                createDate: new Date(),
                status: true,
            });
            await this.userVehicleRepository.save(userVehicle);
        }
    
        // Verificar y asignar el rol de DRIVER si no lo tiene
        const driverRole = await this.roleRepository.findOne({ where: { idRole: 'DRIVER' } });
        if (!driverRole) {
            throw new NotFoundException('Rol DRIVER no encontrado');
        }
    
        let userRole = await this.userRoleRepository.findOne({ where: { user, role: driverRole } });
        if (!userRole) {
            const newUserRole = this.userRoleRepository.create({
                user,
                role: driverRole,
                createDate: new Date(),
                status: true,
                isActive: true,
            });
            await this.userRoleRepository.save(newUserRole);
        } else {
            userRole.status = true;
            userRole.isActive = true;
            await this.userRoleRepository.save(userRole);
        }

        // Buscar el rol de PASSENGER
        const passengerRole = await this.roleRepository.findOne({ where: { idRole: 'PASSENGER' } });
        if (!passengerRole) {
            throw new NotFoundException('Rol PASSENGER no encontrado');
        }

        // Actualizar el rol de PASSENGER del usuario a status false
        const passengerUserRole = await this.userRoleRepository.findOne({ where: { user, role: passengerRole } });
        if (passengerUserRole) {
            passengerUserRole.status = false;
            passengerUserRole.isActive = true;
            await this.userRoleRepository.save(passengerUserRole);
        }
    
        // Retornar solo los datos específicos del vehículo
        return {
            idVehicle: vehicle.idVehicle,
            brand: vehicle.brand,
            model: vehicle.model,
            color: vehicle.color,
            year: vehicle.year,
            patent: vehicle.patent,
            greenCard: vehicle.greenCard,
        };
    }
    

    async delete(idVehicle: number, idUser: number): Promise<void> {
        const userVehicle = await this.userVehicleRepository.findOne({ where: { user: { idUser }, vehicle: { idVehicle } } });
        if (!userVehicle) {
            throw new NotFoundException('Vehículo no encontrado o no pertenece al usuario');
        }

        // Realizar la baja lógica del vehículo
        userVehicle.status = false;
        userVehicle.deleteDate = new Date();
        await this.userVehicleRepository.save(userVehicle);

        // Verificar si quedan vehículos activos para el usuario
        const activeVehiclesCount = await this.userVehicleRepository.count({ where: { user: { idUser }, status: true } });
        if (activeVehiclesCount === 0) {
            // Dar de baja lógica el rol de DRIVER
            const driverRole = await this.roleRepository.findOne({ where: { idRole: 'DRIVER' } });
            if (driverRole) {
                const userRole = await this.userRoleRepository.findOne({ where: { user: { idUser }, role: driverRole, status: true } });
                if (userRole) {
                    userRole.status = false;
                    userRole.isActive = false;
                    userRole.deleteDate = new Date();
                    await this.userRoleRepository.save(userRole);
                }
            }
        }
    }

    async getUserAllVehicles(idUser: number): Promise<any[]> {
        // Buscar el usuario y sus vehículos
        const user = await this.userRepository.findOne({ 
            where: { idUser }, 
            relations: ['userVehicles', 'userVehicles.vehicle'] 
        });
    
        // Si el usuario no existe, lanzar una excepción
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }
    
        // Filtrar los vehículos activos y devolverlos
        const activeVehicles = user.userVehicles
        .filter(uv => uv.status)
        .map(uv => ({
            idVehicle: uv.vehicle.idVehicle,
            brand: uv.vehicle.brand,
            model: uv.vehicle.model,
            color: uv.vehicle.color,
            year: uv.vehicle.year,
            patent: uv.vehicle.patent,
            greenCard: uv.vehicle.greenCard,
        }));
    
        return activeVehicles;
      }

    async getUserVehicle(idUser: number, idVehicle: number): Promise<any> {
        const userVehicle = await this.userVehicleRepository.findOne({ where: { user: { idUser }, vehicle: { idVehicle }, status: true }, relations: ['vehicle'] });
        if (!userVehicle) {
            throw new NotFoundException('Vehículo no encontrado o no pertenece al usuario');
        }

        const vehicle = userVehicle.vehicle;

        return {
            idVehicle: vehicle.idVehicle,
            brand: vehicle.brand,
            model: vehicle.model,
            color: vehicle.color,
            year: vehicle.year,
            patent: vehicle.patent,
            greenCard: vehicle.greenCard
        }; 
    }

    async updateVehicle(idVehicle: number, updateVehicleDTO: UpdateVehicleDTO, idUser: number): Promise<Vehicle> {
        const userVehicle = await this.userVehicleRepository.findOne({ where: { user: { idUser }, vehicle: { idVehicle }, status: true }, relations: ['vehicle'] });
        if (!userVehicle) {
            throw new NotFoundException('Vehículo no encontrado o no pertenece al usuario');
        }

        const updatedVehicle = this.vehiclesRepository.merge(userVehicle.vehicle, updateVehicleDTO);
        updatedVehicle.updateAT = new Date(); // Actualizar la fecha de modificación
        return this.vehiclesRepository.save(updatedVehicle);
    }
}
