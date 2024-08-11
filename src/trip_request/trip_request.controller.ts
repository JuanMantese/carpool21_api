import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { TripRequestService } from './trip_request.service';
import { CreateTripRequestDTO } from './dto/create-trip-request.dto';
import { UpdateTripRequestDTO } from './dto/update-trip-request.dto';
import { TrafficModel } from '@googlemaps/google-maps-services-js';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { GetUser } from 'src/auth/jwt/get-user.decorator';
import { User } from 'src/users/users.entity';

@Controller('trip-request')
export class TripRequestController {
    constructor(private tripRequestService: TripRequestService) {}

    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Post('create') // POST /trip-request/create
    create(@Body() createTripRequestDTO: CreateTripRequestDTO, @GetUser() user: User) {
        return this.tripRequestService.create(createTripRequestDTO, user.idUser);
    }

    @UseGuards(JwtAuthGuard)
    @Get('findAll')  // GET /trip-request/findAll
    findAll() {
        return this.tripRequestService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('findOne/:id')   // GET /trip-request/findOne/:id
    findOne(@Param('id') id: number) {
        return this.tripRequestService.findOne(id);
    }

    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Put('update/:id')     // PUT /trip-request/update/:id
    update(@Param('id') id: number, @Body() updateTripRequestDTO: UpdateTripRequestDTO) {
        return this.tripRequestService.updateTrip(id, updateTripRequestDTO);
    }

    @Put('update-reserves/:id') // PUT /trip-request/update-reserves/:id
    updateTripReserves(@Param('id') id: number) {
        return this.tripRequestService.updateTripReserves(id);
    }

    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @Delete('delete/:id') // DELETE /trip-request/delete/:id
    remove(@Param('id') id: number) {
        return this.tripRequestService.remove(id);
    }

    // Endpoint para obtener la distancia y el tiempo entre dos puntos
    @Post('get-time-and-distance') // POST /trip-request/get-time-and-distance
    async getTimeAndDistanceClientRequest(
        @Body('originLat') originLat: number,
        @Body('originLng') originLng: number,
        @Body('destinationLat') destinationLat: number,
        @Body('destinationLng') destinationLng: number,
        @Body('departureTime') departureTime: string,
    ) {
        return this.tripRequestService.getTimeAndDistanceClientRequest(
            originLat,
            originLng,
            destinationLat,
            destinationLng,
            departureTime,
            TrafficModel.best_guess, // Siempre se usa TrafficModel.best_guess
        );
    }

    // Endpoint para encontrar solicitudes de viaje con filtros
    @Get('find-with-filters')  // GET /trip-request/find-with-filters
    findWithFilters(@Query() filters: any) {
        return this.tripRequestService.findWithFilters(filters);
    }

    // Endpoint para encontrar todas las solicitudes de viaje ordenadas por cercanía y tiempo
    @Get('find-all-sorted')  // GET /trip-request/find-all-sorted
    findAllSorted(@Query('originLat') originLat: number, @Query('originLng') originLng: number) {
        return this.tripRequestService.findAllSorted(originLat, originLng);
    }

    @HasRoles(JwtRole.DRIVER)
    @UseGuards(JwtAuthGuard)
    @Get('driver-trips')
    async getDriverTrips(@GetUser() user: User) {
        return this.tripRequestService.findTripsByDriver(user.idUser);
    }
}