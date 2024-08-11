import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { CreateVehicleDTO } from './dto/create-vehicle.dto';
import { Vehicle } from './vehicles.entity';
import { GetUser } from 'src/auth/jwt/get-user.decorator';
import { User } from 'src/users/users.entity';
import { UpdateVehicleDTO } from './dto/update-vehicle.dto';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
    constructor(private vehiclesService: VehiclesService) {}

    @HasRoles(JwtRole.PASSENGER, JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Post('create') //http://localhost:3000/vehicles/create -> POST
    async create(@Body() createVehicleDTO: CreateVehicleDTO, @GetUser() user: any): Promise<Vehicle> {
        return this.vehiclesService.create(createVehicleDTO, user.idUser);
    }

    // Método DELETE para dar de baja lógica un vehículo de un usuario
    @HasRoles(JwtRole.PASSENGER, JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Delete('delete/:idVehicle') //http://localhost:3000/vehicles/delete/:idVehicle -> DELETE
    async delete(@Param('idVehicle') idVehicle: number, @GetUser() user: any): Promise<void> {
        return this.vehiclesService.delete(idVehicle, user.idUser);
    }

    // Método GET para obtener un vehículo específico de un usuario
    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Get('getUserAllVehicles') //http://localhost:3000/vehicles/getUserAllVehicles -> GET
    async getUserAllVehicles(@GetUser() user: User) {
        return this.vehiclesService.getUserAllVehicles(user.idUser);
    }

    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Get('getUserVehicle/:idVehicle') //http://localhost:3000/vehicles/getUserVehicle/:idVehicle -> GET
    async getUserVehicle(
      @GetUser() user: User,
      @Param('idVehicle', ParseIntPipe) idVehicle: number
    ): Promise<Vehicle> {
      return this.vehiclesService.getUserVehicle(user.idUser, idVehicle);
    }
    // Metodo para modificar vehiculos de un usuario
    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Put('update/:idVehicle') //http://localhost:3000/vehicles/update/:idVehicle -> PUT
    async update(
        @Param('idVehicle') idVehicle: number,
        @Body() updateVehicleDTO: UpdateVehicleDTO,
        @GetUser() user: User
    ): Promise<Vehicle> {
        return this.vehiclesService.updateVehicle(idVehicle, updateVehicleDTO, user.idUser);
    }
}
