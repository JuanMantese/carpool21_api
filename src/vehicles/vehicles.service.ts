import { BadRequestException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { InsuranceService } from 'src/insurance/insurance.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserVehicle) private userVehicleRepository: Repository<UserVehicle>,
    @InjectRepository(UserRole) private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    private readonly rolesService: RolesService,
    private readonly insuranceService: InsuranceService,
  ) {}

  async create(createVehicleDTO: CreateVehicleDTO, idUser: number): Promise<any> { // Cambia el tipo de retorno a 'any'
    // Buscar el usuario
    const user = await this.userRepository.findOne({ where: { idUser }, relations: ['userVehicles'] });
    if (!user) {
      console.error(`Error: Usuario con ID ${idUser} no encontrado.`);
      throw new NotFoundException({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });
    }

    // Buscar el vehículo por greenCard
    let vehicle = await this.vehiclesRepository.findOne({ where: { greenCard: createVehicleDTO.greenCard } });

    // Crear y guardar el vehículo
    if (!vehicle) {
      try {
        vehicle = this.vehiclesRepository.create(createVehicleDTO);
        vehicle = await this.vehiclesRepository.save(vehicle);
      } catch (error) {
        console.error(`Error al registrar el vehículo: ${error.message}`);
        throw new BadRequestException({
          statusCode: 400,
          message: 'Error al registrar el vehículo. Verifique los datos ingresados.',
        });
      }
    }

    // Verificar si el vehículo ya está asociado al usuario
    let userVehicle = await this.userVehicleRepository.findOne({ where: { user, vehicle } });
    if (!userVehicle) {
      try {
        userVehicle = this.userVehicleRepository.create({
          user,
          vehicle,
          createDate: new Date(),
          status: true,
        });
        await this.userVehicleRepository.save(userVehicle);
      } catch (error) {
        console.error(`Error al asociar el vehículo al usuario: ${error.message}`);
        throw new HttpException({
          statusCode: 500,
          message: 'Error interno al asociar el vehículo al usuario',
        }, 500);
      }
    }

    // Verificar y asignar el rol de DRIVER si no lo tiene
    const driverRole = await this.roleRepository.findOne({ where: { idRole: 'DRIVER' } });
    if (!driverRole) {
      console.error('Error: Rol DRIVER no encontrado.');
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rol DRIVER no encontrado',
      });
    }

    let userRole = await this.userRoleRepository.findOne({ where: { user, role: driverRole } });
    if (!userRole) {
      try {
        const newUserRole = this.userRoleRepository.create({
          user,
          role: driverRole,
          createDate: new Date(),
          status: true,
          isActive: true,
        });
        await this.userRoleRepository.save(newUserRole);
      } catch (error) {
        console.error(`Error al asignar el rol DRIVER al usuario: ${error.message}`);
        throw new HttpException({
          statusCode: 500,
          message: 'Error interno al asignar el rol DRIVER',
        }, 500);
      }
    } else {
      userRole.status = true;
      userRole.isActive = true;
      await this.userRoleRepository.save(userRole);
    }

    // Buscar el rol de PASSENGER
    const passengerRole = await this.roleRepository.findOne({ where: { idRole: 'PASSENGER' } });
    if (!passengerRole) {
      console.error('Error: Rol PASSENGER no encontrado.');
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rol PASSENGER no encontrado',
      });
    }

    // Actualizar el rol de PASSENGER del usuario a status false
    const passengerUserRole = await this.userRoleRepository.findOne({ where: { user, role: passengerRole } });
    if (passengerUserRole) {
      passengerUserRole.status = false;
      passengerUserRole.isActive = true;
      await this.userRoleRepository.save(passengerUserRole);
    }

    const insuranceDto = {
      idVehicle: vehicle.idVehicle,
      insuranceCompany: createVehicleDTO.insuranceCompany,
      insuranceType: createVehicleDTO.insuranceType,
      insuranceExpiration: createVehicleDTO.insuranceExpiration,
      policyNumber: createVehicleDTO.policyNumber,
      cuil_cuit: createVehicleDTO.cuil_cuit,
      active: true,
    };

    try {
      await this.insuranceService.createOrUpdate(insuranceDto);
    } catch (error) {
      console.error(`Error al registrar el seguro: ${error.message}`);
      throw new BadRequestException({
        statusCode: 400,
        message: 'Error al registrar el seguro. Verifique los datos ingresados.',
      });
    }
  
    // Retornar los datos específicos del vehículo y el seguro
    return {
      idVehicle: vehicle.idVehicle,
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      year: vehicle.year,
      patent: vehicle.patent,
      greenCard: vehicle.greenCard,
      insuranceCompany: createVehicleDTO.insuranceCompany,
      insuranceType: createVehicleDTO.insuranceType,
      insuranceExpiration: createVehicleDTO.insuranceExpiration,
      policyNumber: createVehicleDTO.policyNumber,
      cuilCuit: createVehicleDTO.cuil_cuit,
    };
  }
  

  async delete(idVehicle: number, idUser: number): Promise<void> {
    const userVehicle = await this.userVehicleRepository.findOne({ where: { user: { idUser }, vehicle: { idVehicle } } });
    if (!userVehicle) {
      console.error(`Error: Vehículo con ID ${idVehicle} no encontrado o no pertenece al usuario con ID ${idUser}.`);
      throw new NotFoundException({
        statusCode: 404,
        message: 'Vehículo no encontrado o no pertenece al usuario',
      });
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
      relations: [
        'userVehicles', 
        'userVehicles.vehicle',
        'userVehicles.vehicle.insurance'
      ] 
    });

    // Si el usuario no existe, lanzar una excepción
    if (!user) {
      console.error(`Error: Usuario con ID ${idUser} no encontrado.`);
      throw new NotFoundException({
        statusCode: 404,
        message: 'Usuario no encontrado',
      });
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
        insuranceCompany: uv.vehicle.insurance?.insuranceCompany || null,
        insuranceType: uv.vehicle.insurance?.insuranceType || null,
        insuranceExpiration: uv.vehicle.insurance?.insuranceExpiration || null,
        policyNumber: uv.vehicle.insurance?.policyNumber || null,
        cuilCuit: uv.vehicle.insurance?.cuil_cuit || null,
      }));

    return activeVehicles;
  }

  async getUserVehicle(idUser: number, idVehicle: number): Promise<any> {
    const userVehicle = await this.userVehicleRepository.findOne({ 
      where: { user: { idUser }, 
      vehicle: { idVehicle }, status: true }, 
      relations: ['vehicle', 'vehicle.insurance'] 
    });

    if (!userVehicle) {
      console.error(`Error: Vehículo con ID ${idVehicle} no encontrado o no pertenece al usuario con ID ${idUser}.`);
      throw new NotFoundException({
        statusCode: 404,
        message: 'Vehículo no encontrado o no pertenece al usuario',
      });
    }

    
    
    const vehicle = userVehicle.vehicle;
    console.log(vehicle);
    console.log(vehicle.insurance?.cuil_cuit);
    

    return {
      idVehicle: vehicle.idVehicle,
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      year: vehicle.year,
      patent: vehicle.patent,
      greenCard: vehicle.greenCard,
      insuranceCompany: vehicle.insurance?.insuranceCompany || null,
      insuranceType: vehicle.insurance?.insuranceType || null,
      insuranceExpiration: vehicle.insurance?.insuranceExpiration || null,
      policyNumber: vehicle.insurance?.policyNumber || null,
      cuilCuit: vehicle.insurance?.cuil_cuit || null,
    }; 
  }

  async updateVehicle(idVehicle: number, updateVehicleDTO: UpdateVehicleDTO, idUser: number): Promise<Vehicle> {
    const userVehicle = await this.userVehicleRepository.findOne({ where: { user: { idUser }, vehicle: { idVehicle }, status: true }, relations: ['vehicle'] });
    if (!userVehicle) {
      console.error(`Error: Vehículo con ID ${idVehicle} no encontrado o no pertenece al usuario con ID ${idUser}.`);
      throw new NotFoundException({
        statusCode: 404,
        message: 'Vehículo no encontrado o no pertenece al usuario',
      });
    }

    const updatedVehicle = this.vehiclesRepository.merge(userVehicle.vehicle, updateVehicleDTO);
    updatedVehicle.updateAT = new Date(); // Actualizar la fecha de modificación
    return this.vehiclesRepository.save(updatedVehicle);
  }
}
