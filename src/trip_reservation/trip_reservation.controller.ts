import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TripReservationService } from './trip_reservation.service';
import { CreateTripReservationDTO } from './dto/create-trip-reservation.dto';
import { UpdateTripReservationDTO } from './dto/update-trip-reservation.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { GetUser } from 'src/auth/jwt/get-user.decorator';
import { User } from 'src/users/users.entity';

@Controller('trip-reservation')
export class TripReservationController {
    constructor(private tripReservationService: TripReservationService) {}

    @HasRoles(JwtRole.PASSENGER)
    @UseGuards(JwtAuthGuard)
    @Post('reserve-seat') // POST /trip-reservation/reserve-seat
    reserveSeat(@GetUser() user: User, @Body() createTripReservationDTO: CreateTripReservationDTO) {
        return this.tripReservationService.reserveSeat(createTripReservationDTO, user.idUser);
    }

    @UseGuards(JwtAuthGuard)
    @Get('findAll')  // GET /trip-reservation/findAll
    findAll() {
        return this.tripReservationService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('findOne/:id')   // GET /trip-reservation/findOne/:id
    findOne(@Param('id') id: number) {
        return this.tripReservationService.findOne(id);
    }

    @HasRoles(JwtRole.PASSENGER)
    @UseGuards(JwtAuthGuard)
    @Put('update/:id')     // PUT /trip-reservation/update/:id
    update(@Param('id') id: number, @Body() updateTripReservationDTO: UpdateTripReservationDTO) {
        return this.tripReservationService.update(id, updateTripReservationDTO);
    }

    @HasRoles(JwtRole.PASSENGER)
    @UseGuards(JwtAuthGuard)
    @Delete('cancel/:id') // DELETE /trip-reservation/cancel/:id
    cancelReservation(@Param('id') id: number) {
        return this.tripReservationService.cancelReservation(id);
    }

    @Put('update-reserves/:id') // PUT /trip-reservation/update-reserves/:id
    updateTripReserves(@Param('id') id: number) {
        return this.tripReservationService.updateTripReserves(id);
    }

    @HasRoles(JwtRole.PASSENGER)
    @UseGuards(JwtAuthGuard)
    @Get('my-reservations')
    async getReservations(@GetUser() user: User) {
        return this.tripReservationService.getReservations(user.idUser);
    }
}
