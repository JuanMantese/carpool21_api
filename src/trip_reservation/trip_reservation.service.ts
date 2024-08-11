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
    ) {}

    // Método para reservar un asiento en un viaje
    async reserveSeat(createTripReservationDTO: CreateTripReservationDTO, passengerId: number): Promise<any> {
        const { tripRequestId, isPaid } = createTripReservationDTO;
    
        // Buscar la solicitud de viaje por ID usando una consulta directa
        const tripRequest = await this.tripRequestRepository.query(
            `SELECT * FROM trip_requests WHERE idTrip = ?`,
            [tripRequestId]
        );
        
        if (!tripRequest || tripRequest.length === 0) {
            throw new NotFoundException('Trip request not found');
        }
    
        const tripRequestEntity = tripRequest[0];
    
        // Verificar si hay asientos disponibles
        if (tripRequestEntity.availableSeats <= 0) {
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
        if (tripRequestEntity.idDriver === passengerId) {
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
    
        // Crear la reserva usando una consulta directa
        await this.tripReservationRepository.query(
            `INSERT INTO trip_reservations (tripRequestId, idUser, reservationDate, isPaid) VALUES (?, ?, ?, ?)`,
            [tripRequestId, passengerId, new Date(), isPaid]
        );
    
        // Reducir el número de asientos disponibles
        tripRequestEntity.availableSeats -= 1;
        await this.tripRequestRepository.query(
            `UPDATE trip_requests SET availableSeats = ? WHERE idTrip = ?`,
            [tripRequestEntity.availableSeats, tripRequestId]
        );
    
         // Devolver la reserva creada con los detalles requeridos
         const newReservation = await this.tripReservationRepository.query(
            `SELECT tr.idReservation, tr.isPaid, tr.reservationDate, 
                    t.idTrip, t.idDriver, t.pickupNeighborhood, t.pickupText, ST_AsText(t.pickupLocation) as pickupLocation, 
                    t.destinationNeighborhood, t.destinationText, ST_AsText(t.destinationLocation) as destinationLocation, 
                    t.compensation, t.departureTime, t.distance, t.timeDifference, t.observations, 
                    v.idVehicle, v.brand, v.model, v.year, v.patent, v.color,
                    u.idUser as idDriver, u.name as driverName, u.lastName as driverLastName, u.phone as driverPhone, u.photoUser as driverPhoto
             FROM trip_reservations tr
             JOIN trip_requests t ON tr.tripRequestId = t.idTrip
             JOIN vehicles v ON t.vehicleId = v.idVehicle
             JOIN users u ON t.idDriver = u.idUser
             WHERE tr.tripRequestId = ? AND tr.idUser = ?
             ORDER BY tr.idReservation DESC LIMIT 1`,
            [tripRequestId, passengerId]
        );

        const reservation = newReservation[0];

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
                compensation: reservation.compensation,
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
            }
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

    // Método para obtener todas las reservas
    async findAll(): Promise<any[]> {
        const reservations = await this.tripReservationRepository.query(
            `SELECT idReservation, tripRequestId, idUser, reservationDate, isPaid, cancellationDate
             FROM trip_reservations`
        );

        return await Promise.all(reservations.map(async (reservation) => {
            const tripRequest = await this.findTripRequestById(reservation.tripRequestId);
            const driver = await this.findUserById(tripRequest.driver.idUser);
            
            return {
                idReservation: reservation.idReservation,
                isPaid: Boolean(reservation.isPaid),
                tripRequest: {
                    idTrip: tripRequest.idTrip,
                    idDriver: tripRequest.driver.idUser,
                    pickupNeighborhood: tripRequest.pickupNeighborhood,
                    pickupText: tripRequest.pickupText,
                    pickupLat: tripRequest.pickupLat,
                    pickupLng: tripRequest.pickupLng,
                    destinationNeighborhood: tripRequest.destinationNeighborhood,
                    destinationText: tripRequest.destinationText,
                    destinationLat: tripRequest.destinationLat,
                    destinationLng: tripRequest.destinationLng,
                    compensation: tripRequest.compensation,
                    departureTime: tripRequest.departureTime,
                    distance: tripRequest.distance,
                    timeDifference: tripRequest.timeDifference,
                    observations: tripRequest.observations,
                    vehicle: tripRequest.vehicle,
                },
                driver: {
                    idUser: driver.idUser,
                    name: driver.name,
                    lastName: driver.lastName,
                    phone: driver.phone,
                    photoUser: driver.photoUser,
                }
            };
        }));
    }

    // Método para obtener una reserva por ID
    async findOne(idReservation: number): Promise<any> {
        const reservation = await this.tripReservationRepository.query(
            `SELECT idReservation, tripRequestId, idUser, reservationDate, isPaid, cancellationDate
             FROM trip_reservations
             WHERE idReservation = ?`,
            [idReservation]
        );
    
        if (reservation.length === 0) {
            throw new NotFoundException(`Reservation with ID ${idReservation} not found`);
        }
    
        const tripRequest = await this.findTripRequestById(reservation[0].tripRequestId);
        const driver = await this.findUserById(tripRequest.driver.idUser);

        return {
            idReservation: reservation[0].idReservation,
            isPaid: Boolean(reservation[0].isPaid),
            tripRequest: {
                idTrip: tripRequest.idTrip,
                idDriver: tripRequest.driver.idUser,
                pickupNeighborhood: tripRequest.pickupNeighborhood,
                pickupText: tripRequest.pickupText,
                pickupLat: tripRequest.pickupLat,
                pickupLng: tripRequest.pickupLng,
                destinationNeighborhood: tripRequest.destinationNeighborhood,
                destinationText: tripRequest.destinationText,
                destinationLat: tripRequest.destinationLat,
                destinationLng: tripRequest.destinationLng,
                compensation: tripRequest.compensation,
                departureTime: tripRequest.departureTime,
                distance: tripRequest.distance,
                timeDifference: tripRequest.timeDifference,
                observations: tripRequest.observations,
                vehicle: tripRequest.vehicle,
            },
            driver: {
                idUser: driver.idUser,
                name: driver.name,
                lastName: driver.lastName,
                phone: driver.phone,
                photoUser: driver.photoUser,
            }
        };
    }
    async getReservations(passengerId: number): Promise<{ futureReservations: any[], pastReservations: any[] }> {
        const currentTime = new Date().toISOString();
    
        const futureReservations = await this.tripReservationRepository.query(
            `SELECT tr.idReservation, tr.isPaid, t.idTrip, t.idDriver, t.pickupNeighborhood, t.pickupText, 
                    ST_AsWKT(t.pickupLocation) as pickupLocation, t.destinationNeighborhood, t.destinationText, 
                    ST_AsWKT(t.destinationLocation) as destinationLocation, t.compensation, t.departureTime, 
                    t.distance, t.timeDifference, t.observations, t.vehicleId, u.idUser, u.name, u.lastName, u.phone, u.photoUser
             FROM trip_reservations tr
             JOIN trip_requests t ON tr.tripRequestId = t.idTrip
             JOIN users u ON t.idDriver = u.idUser
             WHERE tr.idUser = ? AND t.departureTime > ?`,
            [passengerId, currentTime]
        );
    
        const pastReservations = await this.tripReservationRepository.query(
            `SELECT tr.idReservation, tr.isPaid, t.idTrip, t.idDriver, t.pickupNeighborhood, t.pickupText, 
                    ST_AsWKT(t.pickupLocation) as pickupLocation, t.destinationNeighborhood, t.destinationText, 
                    ST_AsWKT(t.destinationLocation) as destinationLocation, t.compensation, t.departureTime, 
                    t.distance, t.timeDifference, t.observations, t.vehicleId, u.idUser, u.name, u.lastName, u.phone, u.photoUser
             FROM trip_reservations tr
             JOIN trip_requests t ON tr.tripRequestId = t.idTrip
             JOIN users u ON t.idDriver = u.idUser
             WHERE tr.idUser = ? AND t.departureTime <= ?`,
            [passengerId, currentTime]
        );
    
        const futureReservationsWithDetails = await Promise.all(futureReservations.map(async (reservation) => {
            const { pickupLat, pickupLng } = this.parsePointPickup(reservation.pickupLocation);
            const { destinationLat, destinationLng } = this.parsePointDestination(reservation.destinationLocation);
    
            const vehicle = await this.vehicleRepository.query(
                `SELECT idVehicle, brand, model, year, patent, color 
                 FROM vehicles 
                 WHERE idVehicle = ?`,
                [reservation.vehicleId]
            );
    
            const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };
    
            return {
                idReservation: reservation.idReservation,
                isPaid: Boolean(reservation.isPaid),
                tripRequest: {
                    idTrip: reservation.idTrip,
                    idDriver: reservation.idDriver,
                    pickupNeighborhood: reservation.pickupNeighborhood,
                    pickupText: reservation.pickupText,
                    pickupLat,
                    pickupLng,
                    destinationNeighborhood: reservation.destinationNeighborhood,
                    destinationText: reservation.destinationText,
                    destinationLat,
                    destinationLng,
                    compensation: reservation.compensation,
                    departureTime: reservation.departureTime,
                    distance: reservation.distance,
                    timeDifference: reservation.timeDifference,
                    observations: reservation.observations,
                    vehicle: vehicleDetails
                },
                driver: {
                    idDriver: reservation.idDriver,
                    name: reservation.name,
                    lastName: reservation.lastName,
                    phone: reservation.phone,
                    photoUser: reservation.photoUser,
                }
            };
        }));
    
        const pastReservationsWithDetails = await Promise.all(pastReservations.map(async (reservation) => {
            const { pickupLat, pickupLng } = this.parsePointPickup(reservation.pickupLocation);
            const { destinationLat, destinationLng } = this.parsePointDestination(reservation.destinationLocation);
    
            const vehicle = await this.vehicleRepository.query(
                `SELECT idVehicle, brand, model, year, patent, color 
                 FROM vehicles 
                 WHERE idVehicle = ?`,
                [reservation.vehicleId]
            );
    
            const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };
    
            return {
                idReservation: reservation.idReservation,
                isPaid: Boolean(reservation.isPaid),
                tripRequest: {
                    idTrip: reservation.idTrip,
                    idDriver: reservation.idDriver,
                    pickupNeighborhood: reservation.pickupNeighborhood,
                    pickupText: reservation.pickupText,
                    pickupLat,
                    pickupLng,
                    destinationNeighborhood: reservation.destinationNeighborhood,
                    destinationText: reservation.destinationText,
                    destinationLat,
                    destinationLng,
                    compensation: reservation.compensation,
                    departureTime: reservation.departureTime,
                    distance: reservation.distance,
                    timeDifference: reservation.timeDifference,
                    observations: reservation.observations,
                    vehicle: vehicleDetails
                },
                driver: {
                    idDriver: reservation.idDriver,
                    name: reservation.name,
                    lastName: reservation.lastName,
                    phone: reservation.phone,
                    photoUser: reservation.photoUser,
                }
            };
        }));
    
        return {
            futureReservations: futureReservationsWithDetails,
            pastReservations: pastReservationsWithDetails
        };
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
