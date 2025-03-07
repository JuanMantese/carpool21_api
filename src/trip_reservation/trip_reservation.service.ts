import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TripReservation } from './trip_reservation.entity';
import { UpdateTripReservationDTO } from './dto/update-trip-reservation.dto';
import { TripRequest } from 'src/trip_request/trip_request.entity';
import { CreateTripReservationDTO } from './dto/create-trip-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { Repository } from 'typeorm';
import { Point } from 'geojson';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripRequestService } from 'src/trip_request/trip_request.service';
import { CompensationService } from 'src/compensation/compensation.service';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class TripReservationService {
  constructor(
    @InjectRepository(TripReservation)
    private tripReservationRepository: Repository<TripReservation>,
    @InjectRepository(TripRequest)
    private tripRequestRepository: Repository<TripRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,

    private readonly compensationService: CompensationService,
    private readonly paymentsService: PaymentsService,
    private readonly tripRequestService: TripRequestService,
  ) {}

  // Método para reservar un asiento en un viaje
  async reserveSeat(createTripReservationDTO: CreateTripReservationDTO, passengerId: number): Promise<any> {
    const { tripRequestId, paymentMethod, saveNewCard, cardNumber, ownerName, expirationDate, cvv } = createTripReservationDTO;

    const tripRequest = await this.tripRequestService.findOne(tripRequestId);

    // Verificar si hay asientos disponibles
    if (tripRequest.availableSeats <= 0) {
      throw new Error('No available seats');
    }

    // Buscar al pasajero por ID y verificar que tenga el rol de PASSENGER
    const passenger = await this.userRepository.findOne({
      where: { idUser: passengerId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!passenger || !passenger.userRoles.some(userRole => userRole.role.idRole === 'PASSENGER' && userRole.status)) {
      throw new UnauthorizedException('Passenger not found or not authorized');
    }

    // Verificar que el pasajero no sea el conductor del viaje
    if (tripRequest.idDriver === passengerId) {
      throw new BadRequestException('The driver cannot reserve a seat in their own trip');
    }

    // Verificar que el pasajero no haya reservado ya un asiento en el mismo viaje
    const existingReservation = await this.tripReservationRepository.query(
      `SELECT * FROM trip_reservations WHERE tripRequestId = ? AND idUser = ?`,
      [tripRequestId, passengerId]
    );
    if (existingReservation.length > 0) {
      throw new BadRequestException('Passenger already has a reservation for this trip');
    }

    console.log(paymentMethod);
    

    // 2. Procesar el método de pago
    let isPaid = false;
    let paymentId = null;

    // Si el método de pago es CASH, se registra la reserva sin el pago realizado hasta que el usuario lo confirme
    if (paymentMethod !== 'CASH') {

      // Si el método de pago es 'OtherCard', el usuario eligio un metodo de pago no registrado
      if (paymentMethod === 'OtherCard') {
        if (!cardNumber || !ownerName || !expirationDate || !cvv) {
          throw new BadRequestException('Faltan datos de la tarjeta');
        }

        // Procesando y registrando el pago / Ademas registro la tarjeta si el usuario lo decidio
        const createPaymentsDto = {
          tripId: tripRequestId,
          paymentMethod,
          amount: tripRequest.compensation,
          saveNewCard,
          cardNumber, 
          ownerName, 
          expirationDate, 
          cvv 
        };
        const payment = await this.paymentsService.registerPayment(passengerId, createPaymentsDto);
        isPaid = true; // Pago realizado
        paymentId = payment.idPayment; // ID del pago

      } else {
        // Procesando y registrando el pago con la tarjeta del usuario
        const createPaymentsDto = {
          tripId: tripRequestId,
          paymentMethod,
          amount: tripRequest.compensation
        };
        const payment = await this.paymentsService.registerPayment(passengerId, createPaymentsDto);
        isPaid = true; // Pago realizado
        paymentId = payment.idPayment; // ID del pago
      }
    }

    // Crear la reserva usando una consulta directa
    await this.tripReservationRepository.query(
      `INSERT INTO trip_reservations (
        tripRequestId, 
        idUser, 
        reservationDate,
        paymentMethod,
        isPaid,
        paymentId
      ) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [tripRequestId, passengerId, new Date(), paymentMethod, isPaid, paymentId]
    );

    // Reducir el número de asientos disponibles
    tripRequest.availableSeats -= 1;
    await this.tripRequestRepository.query(
      `UPDATE trip_requests SET availableSeats = ? WHERE idTrip = ?`,
      [tripRequest.availableSeats, tripRequestId]
    );

    // Devolver la reserva creada con los detalles requeridos
    const newReservation = await this.tripReservationRepository.query(
      `SELECT 
          tr.idReservation, 
          tr.isPaid, 
          tr.reservationDate, 
          t.idTrip, 
          t.idDriver, 
          t.pickupNeighborhood, 
          t.pickupText, 
          ST_AsText(t.pickupLocation) as pickupLocation, 
          t.destinationNeighborhood, 
          t.destinationText, 
          ST_AsText(t.destinationLocation) as destinationLocation, 
          t.compensationId, 
          t.departureTime, 
          t.distance, 
          t.timeDifference, 
          t.observations, 
          v.idVehicle, 
          v.brand, 
          v.model, 
          v.year, 
          v.patent, 
          v.color,
          u.idUser as idDriver, 
          u.name as driverName, 
          u.lastName as driverLastName, 
          u.phone as driverPhone, 
          u.photoUser as driverPhoto,
          c.amount AS compensationAmount,
          p.idPayment,
          p.paymentMethod,
          p.amount AS paymentAmount,
          p.paymentDate
        FROM trip_reservations tr
        JOIN trip_requests t ON tr.tripRequestId = t.idTrip
        JOIN vehicles v ON t.vehicleId = v.idVehicle
        JOIN users u ON t.idDriver = u.idUser
        LEFT JOIN compensation c ON t.compensationId = c.idCompensation
        LEFT JOIN payments p ON t.idTrip = p.tripId AND tr.idUser = p.userId
        WHERE tr.tripRequestId = ? AND tr.idUser = ?
        ORDER BY tr.idReservation DESC LIMIT 1`,
      [tripRequestId, passengerId]
    );

    // Datos de la reserva
    const reservation = newReservation[0];    

    // Obtener el monto de la compensación si existe
    if (reservation.compensationId) {
      const compensationData = await this.compensationService.findOne(reservation.compensationId);
      reservation.compensationId = compensationData ? compensationData.amount : 0;
    }

    // Parse pickup and destination locations
    const pickupLocationMatches = reservation.pickupLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    const destinationLocationMatches = reservation.destinationLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);

    return {
      idReservation: reservation.idReservation,
      isPaid: Boolean(reservation.isPaid),
      tripRequest: {
        idTrip: reservation.idTrip,
        idDriver: reservation.idDriver,
        pickupNeighborhood: reservation.pickupNeighborhood,
        pickupText: reservation.pickupText,
        pickupLat: parseFloat(pickupLocationMatches[2]),
        pickupLng: parseFloat(pickupLocationMatches[1]),
        destinationNeighborhood: reservation.destinationNeighborhood,
        destinationText: reservation.destinationText,
        destinationLat: parseFloat(destinationLocationMatches[2]),
        destinationLng: parseFloat(destinationLocationMatches[1]),
        compensation: reservation.compensationId,
        departureTime: reservation.departureTime,
        distance: reservation.distance,
        timeDifference: reservation.timeDifference,
        observations: reservation.observations,
        vehicle: {
          idVehicle: reservation.idVehicle,
          brand: reservation.brand,
          model: reservation.model,
          year: reservation.year,
          patent: reservation.patent,
          color: reservation.color
        }
      },
      driver: {
        idDriver: reservation.idDriver,
        name: reservation.driverName,
        lastName: reservation.driverLastName,
        phone: reservation.driverPhone,
        photoUser: reservation.driverPhoto,
      },
      payment: reservation.idPayment
        ? {
            idPayment: reservation.idPayment,
            paymentMethod: reservation.paymentMethod,
            paymentAmount: reservation.paymentAmount,
            paymentDate: reservation.paymentDate,
          }
        : null,
    };
  }


  // Método para actualizar las reservas de un viaje
  async updateTripReserves(tripRequestId: number): Promise<TripRequest> {
    // Buscar la solicitud de viaje por ID junto con las reservas asociadas
    const tripRequest = await this.tripRequestRepository.findOne({
      where: { idTrip: tripRequestId },
      relations: ['reservations'],
    });

    // Lanzar una excepción si no se encuentra la solicitud de viaje
    if (!tripRequest) {
      throw new NotFoundException('Trip request not found');
    }

    // Contar el número de reservas realizadas para este viaje
    const reservedSeats = tripRequest.reservations.length;

    // Restar el número de asientos reservados de los asientos disponibles
    tripRequest.availableSeats -= reservedSeats;

    // Guardar y devolver la solicitud de viaje actualizada
    return this.tripRequestRepository.save(tripRequest);
  }


  // Método para cancelar una reserva
  async cancelReservation(idReservation: number): Promise<TripReservation> {
    // Buscar la reserva por ID junto con la solicitud de viaje asociada
    const reservation = await this.tripReservationRepository.findOne({
      where: { idReservation: idReservation },
      relations: ['tripRequest'],
    });

    // Lanzar una excepción si no se encuentra la reserva
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Establecer la fecha de cancelación de la reserva a la fecha y hora actual
    reservation.cancellationDate = new Date();

    // Incrementar el número de asientos disponibles en la solicitud de viaje asociada
    reservation.tripRequest.availableSeats += 1;

    // Guardar los cambios en la solicitud de viaje en el repositorio
    await this.tripRequestRepository.save(reservation.tripRequest);

    // Guardar la reserva actualizada en el repositorio y devolverla
    return this.tripReservationRepository.save(reservation);
  }

  // Método para actualizar una reserva
  async update(idReservation: number, updateTripReservationDTO: UpdateTripReservationDTO): Promise<TripReservation> {
    // Buscar la reserva por ID junto con la solicitud de viaje asociada
    const reservation = await this.tripReservationRepository.findOne({
      where: { idReservation: idReservation },
      relations: ['tripRequest'],
    });

    // Lanzar una excepción si no se encuentra la reserva
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Asignar las nuevas propiedades de DTO a la reserva existente
    const updatedReservation = Object.assign(reservation, updateTripReservationDTO);

    // Guardar la reserva actualizada en el repositorio y devolverla
    return this.tripReservationRepository.save(updatedReservation);
  }


  // Método para obtener todas las reservas - Admin
  async findAll(): Promise<any[]> {
    const reservations = await this.tripReservationRepository.query(
      `SELECT idReservation
      FROM trip_reservations`
    );

    return await Promise.all(
      reservations.map(async (reservation) => {
        return await this.findOne(reservation.idReservation);
      }
    ));
  }


  // Método para obtener una reserva por el ID de la misma
  async findOne(idReservation: number): Promise<any> {
    const reservations = await this.tripReservationRepository.query(
      `SELECT 
          tr.idReservation, 
          tr.isPaid, 
          tr.reservationDate, 
          t.idTrip, 
          t.idDriver, 
          t.pickupNeighborhood, 
          t.pickupText, 
          ST_AsText(t.pickupLocation) as pickupLocation, 
          t.destinationNeighborhood, 
          t.destinationText, 
          ST_AsText(t.destinationLocation) as destinationLocation, 
          t.compensationId, 
          t.departureTime, 
          t.distance, 
          t.timeDifference, 
          t.observations, 
          v.idVehicle, 
          v.brand, 
          v.model, 
          v.year, 
          v.patent, 
          v.color,
          u.idUser as idDriver, 
          u.name as driverName, 
          u.lastName as driverLastName, 
          u.phone as driverPhone, 
          u.photoUser as driverPhoto,
          c.amount AS compensationAmount,
          p.idPayment,
          p.paymentMethod,
          p.amount AS paymentAmount,
          p.paymentDate
        FROM trip_reservations tr
        JOIN trip_requests t ON tr.tripRequestId = t.idTrip
        JOIN vehicles v ON t.vehicleId = v.idVehicle
        JOIN users u ON t.idDriver = u.idUser
        LEFT JOIN compensation c ON t.compensationId = c.idCompensation
        LEFT JOIN payments p ON t.idTrip = p.tripId AND tr.idUser = p.userId
        WHERE idReservation = ?
        ORDER BY tr.idReservation DESC LIMIT 1`,
      [idReservation]
    );

    if (reservations.length === 0) {
      throw new NotFoundException(`Reservation with ID ${idReservation} not found`);
    }

    // Datos de la reserva
    const reservation = reservations[0];    

    // Obtener el monto de la compensación si existe
    if (reservation.compensationId) {
      const compensationData = await this.compensationService.findOne(reservation.compensationId);
      reservation.compensationId = compensationData ? compensationData.amount : 0;
    }

    // Parse pickup and destination locations
    const pickupLocationMatches = reservation.pickupLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    const destinationLocationMatches = reservation.destinationLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);

    return {
      idReservation: reservation.idReservation,
      isPaid: Boolean(reservation.isPaid),
      tripRequest: {
        idTrip: reservation.idTrip,
        idDriver: reservation.idDriver,
        pickupNeighborhood: reservation.pickupNeighborhood,
        pickupText: reservation.pickupText,
        pickupLat: parseFloat(pickupLocationMatches[2]),
        pickupLng: parseFloat(pickupLocationMatches[1]),
        destinationNeighborhood: reservation.destinationNeighborhood,
        destinationText: reservation.destinationText,
        destinationLat: parseFloat(destinationLocationMatches[2]),
        destinationLng: parseFloat(destinationLocationMatches[1]),
        compensation: reservation.compensationId,
        departureTime: reservation.departureTime,
        distance: reservation.distance,
        timeDifference: reservation.timeDifference,
        observations: reservation.observations,
        vehicle: {
          idVehicle: reservation.idVehicle,
          brand: reservation.brand,
          model: reservation.model,
          year: reservation.year,
          patent: reservation.patent,
          color: reservation.color
        }
      },
      driver: {
        idDriver: reservation.idDriver,
        name: reservation.driverName,
        lastName: reservation.driverLastName,
        phone: reservation.driverPhone,
        photoUser: reservation.driverPhoto,
      },
      payment: reservation.idPayment
        ? {
            idPayment: reservation.idPayment,
            paymentMethod: reservation.paymentMethod,
            paymentAmount: reservation.paymentAmount,
            paymentDate: reservation.paymentDate,
          }
        : null,
    };
  }


  // Metodo para traer todas las reservas de un Usuario especifico
  async getReservations(passengerId: number): Promise<{ futureReservations: any[], pastReservations: any[] }> {
    const currentTime = new Date().toISOString();

    // Obtener todas las reservas del usuario
    const reservations = await this.tripReservationRepository.query(
      `SELECT tr.idReservation, tr.isPaid, tr.tripRequestId 
        FROM trip_reservations tr
        WHERE tr.idUser = ?`,
      [passengerId]
    );

    if (!reservations.length) {
      return {
        futureReservations: [],
        pastReservations: []
      };
    }
    
    // Obtener los detalles de cada reserva usando findOne
    const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
      return await this.findOne(reservation.idReservation);
    }));

    // Separar reservas futuras y pasadas según la fecha de salida
    const futureReservations = reservationsWithDetails.filter(reservation => reservation.tripRequest.departureTime > currentTime);
    const pastReservations = reservationsWithDetails.filter(reservation => reservation.tripRequest.departureTime <= currentTime);

    return {
      futureReservations,
      pastReservations
    };


    // const futureReservations = await this.tripReservationRepository.query(
    //   `SELECT tr.idReservation, tr.isPaid, t.idTrip, t.idDriver, t.pickupNeighborhood, t.pickupText, 
    //           ST_AsWKT(t.pickupLocation) as pickupLocation, t.destinationNeighborhood, t.destinationText, 
    //           ST_AsWKT(t.destinationLocation) as destinationLocation, t.compensationId, t.departureTime, 
    //           t.distance, t.timeDifference, t.observations, t.vehicleId, u.idUser, u.name, u.lastName, u.phone, u.photoUser
    //     FROM trip_reservations tr
    //     JOIN trip_requests t ON tr.tripRequestId = t.idTrip
    //     JOIN users u ON t.idDriver = u.idUser
    //     WHERE tr.idUser = ? AND t.departureTime > ?`,
    //   [passengerId, currentTime]
    // );
  
    // const pastReservations = await this.tripReservationRepository.query(
    //   `SELECT tr.idReservation, tr.isPaid, t.idTrip, t.idDriver, t.pickupNeighborhood, t.pickupText, 
    //           ST_AsWKT(t.pickupLocation) as pickupLocation, t.destinationNeighborhood, t.destinationText, 
    //           ST_AsWKT(t.destinationLocation) as destinationLocation, t.compensationId, t.departureTime, 
    //           t.distance, t.timeDifference, t.observations, t.vehicleId, u.idUser, u.name, u.lastName, u.phone, u.photoUser
    //     FROM trip_reservations tr
    //     JOIN trip_requests t ON tr.tripRequestId = t.idTrip
    //     JOIN users u ON t.idDriver = u.idUser
    //     WHERE tr.idUser = ? AND t.departureTime <= ?`,
    //   [passengerId, currentTime]
    // );

    // console.log(pastReservations);
    

    // const futureReservationsWithDetails = await Promise.all(futureReservations.map(async (reservation) => {
    //   const { pickupLat, pickupLng } = this.parsePointPickup(reservation.pickupLocation);
    //   const { destinationLat, destinationLng } = this.parsePointDestination(reservation.destinationLocation);

    //   const vehicle = await this.vehicleRepository.query(
    //     `SELECT idVehicle, brand, model, year, patent, color 
    //       FROM vehicles 
    //       WHERE idVehicle = ?`,
    //     [reservation.vehicleId]
    //   );

    //   const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };

    //   // Obtener el monto de la compensación si existe
    //   if (reservation.compensationId) {
    //     const compensationData = await this.compensationService.findOne(reservation.compensationId);
    //     reservation.compensationId = compensationData ? compensationData.amount : 0;
    //   }

    //   return {
    //     idReservation: reservation.idReservation,
    //     isPaid: Boolean(reservation.isPaid),
    //     tripRequest: {
    //       idTrip: reservation.idTrip,
    //       idDriver: reservation.idDriver,
    //       pickupNeighborhood: reservation.pickupNeighborhood,
    //       pickupText: reservation.pickupText,
    //       pickupLat,
    //       pickupLng,
    //       destinationNeighborhood: reservation.destinationNeighborhood,
    //       destinationText: reservation.destinationText,
    //       destinationLat,
    //       destinationLng,
    //       compensation: reservation.compensationId,
    //       departureTime: reservation.departureTime,
    //       distance: reservation.distance,
    //       timeDifference: reservation.timeDifference,
    //       observations: reservation.observations,
    //       vehicle: vehicleDetails
    //     },
    //     driver: {
    //       idDriver: reservation.idDriver,
    //       name: reservation.name,
    //       lastName: reservation.lastName,
    //       phone: reservation.phone,
    //       photoUser: reservation.photoUser,
    //     }
    //   };
    // }));
  
    // const pastReservationsWithDetails = await Promise.all(pastReservations.map(async (reservation) => {
    //   const { pickupLat, pickupLng } = this.parsePointPickup(reservation.pickupLocation);
    //   const { destinationLat, destinationLng } = this.parsePointDestination(reservation.destinationLocation);

    //   const vehicle = await this.vehicleRepository.query(
    //     `SELECT idVehicle, brand, model, year, patent, color 
    //       FROM vehicles 
    //       WHERE idVehicle = ?`,
    //     [reservation.vehicleId]
    //   );

    //   const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };

    //   // Obtener el monto de la compensación si existe
    //   if (reservation.compensationId) {
    //     const compensationData = await this.compensationService.findOne(reservation.compensationId);
    //     reservation.compensationId = compensationData ? compensationData.amount : 0;
    //   }

    //   return {
    //     idReservation: reservation.idReservation,
    //     isPaid: Boolean(reservation.isPaid),
    //     tripRequest: {
    //       idTrip: reservation.idTrip,
    //       idDriver: reservation.idDriver,
    //       pickupNeighborhood: reservation.pickupNeighborhood,
    //       pickupText: reservation.pickupText,
    //       pickupLat,
    //       pickupLng,
    //       destinationNeighborhood: reservation.destinationNeighborhood,
    //       destinationText: reservation.destinationText,
    //       destinationLat,
    //       destinationLng,
    //       compensation: reservation.compensationId,
    //       departureTime: reservation.departureTime,
    //       distance: reservation.distance,
    //       timeDifference: reservation.timeDifference,
    //       observations: reservation.observations,
    //       vehicle: vehicleDetails
    //     },
    //     driver: {
    //       idDriver: reservation.idDriver,
    //       name: reservation.name,
    //       lastName: reservation.lastName,
    //       phone: reservation.phone,
    //       photoUser: reservation.photoUser,
    //     }
    //   };
    // }));

    // return {
    //   futureReservations: futureReservationsWithDetails,
    //   pastReservations: pastReservationsWithDetails
    // };
  }
    
  // Método auxiliar para convertir el texto de la ubicación en un objeto Point
  private parsePointPickup(pointText: string): { pickupLat: number, pickupLng: number } {
    const matches = pointText.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!matches) throw new Error('Invalid point format');
    return {
      pickupLat: parseFloat(matches[2]),
      pickupLng: parseFloat(matches[1]),
    };
  }
  
  private parsePointDestination(pointText: string): { destinationLat: number, destinationLng: number } {
    const matches = pointText.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!matches) throw new Error('Invalid point format');
    return {
      destinationLat: parseFloat(matches[2]),
      destinationLng: parseFloat(matches[1]),
    };
  }

  // Método auxiliar para encontrar la solicitud de viaje por ID
  private async findTripRequestById(idTrip: number): Promise<any> {
    const trip = await this.tripRequestRepository.query(
      `SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation,
              destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation,
              availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
        FROM trip_requests
        WHERE idTrip = ?`,
      [idTrip]
    );
  
    if (trip.length === 0) {
      throw new NotFoundException(`Trip request with ID ${idTrip} not found`);
    }
  
    const pickupLocationMatches = trip[0].pickupLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    const destinationLocationMatches = trip[0].destinationLocation.match(/POINT\(([^ ]+) ([^ ]+)\)/);

    const driver = await this.userRepository.query(
      `SELECT idUser, name, lastName, phone, photoUser 
        FROM users 
        WHERE idUser = ?`,
      [trip[0].idDriver]
    );
  
    const driverDetails = driver.length ? driver[0] : { name: '', lastName: '', phone: '', photoUser: '' };

    const vehicle = await this.vehicleRepository.query(
      `SELECT idVehicle, brand, model, year, patent, color 
        FROM vehicles 
        WHERE idVehicle = ?`,
      [trip[0].vehicleId]
    );
  
    const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };

    return {
      idTrip: trip[0].idTrip,
      driver: driverDetails,
      pickupNeighborhood: trip[0].pickupNeighborhood,
      pickupText: trip[0].pickupText,
      pickupLat: parseFloat(pickupLocationMatches[2]),
      pickupLng: parseFloat(pickupLocationMatches[1]),
      destinationNeighborhood: trip[0].destinationNeighborhood,
      destinationText: trip[0].destinationText,
      destinationLat: parseFloat(destinationLocationMatches[2]),
      destinationLng: parseFloat(destinationLocationMatches[1]),
      availableSeats: trip[0].availableSeats,
      compensation: trip[0].compensation,
      departureTime: trip[0].departureTime,
      distance: trip[0].distance,
      timeDifference: trip[0].timeDifference,
      observations: trip[0].observations,
      vehicle: vehicleDetails,
    };
  }

  // Método auxiliar para encontrar un usuario por ID
  private async findUserById(idUser: number): Promise<any> {
    const user = await this.userRepository.query(
      `SELECT idUser, name, lastName, phone, photoUser
        FROM users
        WHERE idUser = ?`,
      [idUser]
    );

    if (user.length === 0) {
      throw new NotFoundException(`User with ID ${idUser} not found`);
    }

    return {
      idUser: user[0].idUser,
      name: user[0].name,
      lastName: user[0].lastName,
      phone: user[0].phone,
      photoUser: user[0].photoUser,
    };
  }

    // Método auxiliar para convertir el texto de la ubicación en un objeto Point
  private parsePoint(pointText: string): Point {
    const matches = pointText.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!matches) throw new Error('Invalid point format');
    return {
      type: 'Point',
      coordinates: [parseFloat(matches[1]), parseFloat(matches[2])]
    };
  }
}
