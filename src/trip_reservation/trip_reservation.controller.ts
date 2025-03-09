import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TripReservationService } from './trip_reservation.service';
import { CreateTripReservationDTO } from './dto/create-trip-reservation.dto';
import { UpdateTripReservationDTO } from './dto/update-trip-reservation.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { GetUser } from 'src/auth/jwt/get-user.decorator';
import { User } from 'src/users/users.entity';

@Controller('trip-reservation')
export class TripReservationController {
  constructor(private tripReservationService: TripReservationService) {}

  /**
   * Registrando reserva de un asiento en el viaje.
   * @route POST http://localhost:3000/trip-reservation/reserve-seat
   * 
   * @protected Requiere autenticación mediante JWT y el rol de pasajero.
   * @param {User} user - El usuario autenticado obtenido del token JWT.
   * @param {CreateTripReservationDTO} createTripReservationDTO - Datos requeridos para realizar la reserva.
   * @returns {Promise<TripReservation>} Detalle de la reserva realizada por el usuario.
   * @throws {NotFoundException} Si no hay reservas registradas para el usuario.
   */
  @HasRoles(JwtRole.PASSENGER)
  @UseGuards(JwtAuthGuard)
  @Post('reserve-seat') // POST /trip-reservation/reserve-seat
  reserveSeat(@GetUser() user: User, @Body() createTripReservationDTO: CreateTripReservationDTO) {
    return this.tripReservationService.reserveSeat(createTripReservationDTO, user.idUser);
  }

  /** Obtener todas las reservas realizadas en la App - ADMIN
   * GET http://localhost:3000/trip-reservation/findAll
   * 
   * @protected Requiere autenticación mediante JWT.
   * @returns {Promise<TripReservation[]>} Lista de todas las reservas registrada.
   * @throws {NotFoundException} Si no existe ninguna reserva registrada.
   */
  @UseGuards(JwtAuthGuard)
  @Get('findAll')
  findAll() {
    return this.tripReservationService.findAll();
  }

  /** Obtener una reserva por su ID - ADMIN
   * GET http://localhost:3000/trip-reservation/findOne/:id
   * 
   * @protected Requiere autenticación mediante JWT.
   * @param reserveId ID del Pago
   * @returns {Promise<TripReservation>} Detalle de la reserva realizada por el usuario.
   * @throws {NotFoundException} Si no existe ninguna reserva registrada con ese ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get('findOne/:reserveId')   // GET /trip-reservation/findOne/:id
  findOne(@Param('reserveId') reserveId: number) {
    return this.tripReservationService.findOne(reserveId);
  }

  /**
   * Modificando los datos de una reserva realizada por un usuario.
   * @route PUT http://localhost:3000/trip-reservation/update/:reserveId
   * 
   * @protected Requiere autenticación mediante JWT y el rol de pasajero.
   * @param reserveId ID de la Reserva
   * @param {UpdateTripReservationDTO} updateTripReservationDTO - Datos requeridos para actualizar la reserva.
   * @returns {Promise<TripReservation>} Detalle de la reserva realizada por el usuario.
   * @throws {NotFoundException} Si no se puede actualizar la rserva del usuario.
   */
  @HasRoles(JwtRole.PASSENGER)
  @UseGuards(JwtAuthGuard)
  @Put('update/:reserveId')
  update(@Param('reserveId') reserveId: number, @Body() updateTripReservationDTO: UpdateTripReservationDTO) {
    return this.tripReservationService.update(reserveId, updateTripReservationDTO);
  }

  /**
   * Dando de baja una reserva realizada por un usuario - Se elimina de la Base de Datos.
   * @route DELETE http://localhost:3000/trip-reservation/cancel/:reserveId
   * 
   * @protected Requiere autenticación mediante JWT y el rol de pasajero.
   * @param reserveId ID de la Reserva
   * @returns {Promise<TripReservation>} Detalle de la reserva realizada por el usuario.
   * @throws {NotFoundException} Si no hay reservas registradas para el usuario.
   */
  @HasRoles(JwtRole.PASSENGER)
  @UseGuards(JwtAuthGuard)
  @Delete('cancel/:reserveId')
  cancelReservation(@Param('reserveId') reserveId: number) {
    return this.tripReservationService.cancelReservation(reserveId);
  }

  /**
   * Obtiene todas las reservas Pasadas y Futuras realizadas por un usuario específico.
   * @route GET http://localhost:3000/trip-reservation/findAllByUser
   * 
   * @protected Requiere autenticación mediante JWT y el rol de pasajero.
   * @param {User} user - El usuario autenticado obtenido del token JWT.
   * @returns {Promise<TripReservation[]>} Lista de reservas realizadas por el usuario.
   * @throws {NotFoundException} Si no hay reservas registradas para el usuario.
   */
  @HasRoles(JwtRole.PASSENGER)
  @UseGuards(JwtAuthGuard)
  @Get('findAllByUser')
  async getReservations(@GetUser() user: User) {
    return this.tripReservationService.getReservations(user.idUser);
  }
}
