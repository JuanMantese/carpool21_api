import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Client, DistanceMatrixResponseData, TrafficModel, TravelMode } from '@googlemaps/google-maps-services-js';
import { InjectRepository } from '@nestjs/typeorm';
import { TripRequest } from './trip_request.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { Repository } from 'typeorm';
import { CreateTripRequestDTO } from './dto/create-trip-request.dto';
import { Point } from 'geojson';
import { UpdateTripRequestDTO } from './dto/update-trip-request.dto';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';
import { Compensation } from 'src/compensation/compensatio.entity';

@Injectable()
export class TripRequestService extends Client{

    // Clave de API de Google Maps obtenida de las variables de entorno
    private readonly API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    // Cliente de Google Maps Services
    private readonly client = new Client({});
    constructor(
        @InjectRepository(TripRequest)
        private tripRequestRepository: Repository<TripRequest>,
        @InjectRepository(Vehicle)
        private vehicleRepository: Repository<Vehicle>,
        @InjectRepository(TripReservation)
        private tripReservationRepository: Repository<TripReservation>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Compensation)
        private compensationRepository: Repository<Compensation>,
    ) {
        super();
    }

    // Método para crear una nueva solicitud de viaje
    async create(createTripRequestDTO: CreateTripRequestDTO, idDriver: number): Promise<any> {
        const { vehicleId, pickupLat, pickupLng, destinationLat, destinationLng, availableSeats, observations, ...tripData } = createTripRequestDTO;
    
        // Buscar el vehículo por ID
        const vehicle = await this.vehicleRepository.findOneBy({ idVehicle: vehicleId });
        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }
    
        // Buscar el conductor por ID
        const driver = await this.userRepository.findOne({ where: { idUser: idDriver }, relations: ['userRoles', 'userRoles.role'] });
        if (!driver || !driver.userRoles.some(userRole => userRole.role.idRole === 'DRIVER' && userRole.status)) {
            throw new UnauthorizedException('Driver not found or not authorized');
        }
    
        // Buscar la compensación con un valor específico (por ejemplo, 1000)
        const compensation = await this.compensationRepository.findOne({ where: { amount: 1000 } });
        if (!compensation) {
            throw new NotFoundException('Compensation not found');
        }

        // Calcular la distancia y el tiempo de viaje usando la API de Google Maps
        let distance: number;
        let timeDifference: number;
        try {
            const distanceMatrixResponse = await this.retryRequest(() => this.getTimeAndDistanceClientRequest(pickupLat, pickupLng, destinationLat, destinationLng, createTripRequestDTO.departureTime));
            console.log('Distance Matrix Response:', distanceMatrixResponse);
    
            if (distanceMatrixResponse.rows && distanceMatrixResponse.rows.length > 0) {
                const elements = distanceMatrixResponse.rows[0].elements;
                console.log('Elements:', elements); 
                if (elements && elements.length > 0 && elements[0].status === 'OK') {
                    distance = elements[0].distance ? parseFloat((elements[0].distance.value / 1000).toFixed(1)) : null; 
                    timeDifference = elements[0].duration ? Math.round(elements[0].duration.value / 60) : null; 
    
                    if (distance === null || timeDifference === null) {
                        throw new Error('Distance or duration data is missing in the response');
                    }
                } else {
                    throw new Error('Distance or duration data is missing or invalid in the response');
                }
            } else {
                throw new Error('Rows data is missing in the response');
            }
        } catch (error) {
            console.error('Error in getTimeAndDistanceClientRequest:', error.message);
            throw new Error('Failed to fetch distance matrix data');
        }

    
        // Crear la consulta para las ubicaciones de recogida y destino utilizando ST_GeomFromText
        const pickupLocation = `ST_GeomFromText('POINT(${pickupLng} ${pickupLat})')`;
        const destinationLocation = `ST_GeomFromText('POINT(${destinationLng} ${destinationLat})')`;
    
        // Crear y guardar la solicitud de viaje utilizando una consulta bruta para las posiciones espaciales
        await this.tripRequestRepository.query(
            `INSERT INTO trip_requests (idDriver, pickupNeighborhood, pickupText, pickupLocation, destinationNeighborhood, destinationText, destinationLocation, availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId)
            VALUES (?, ?, ?, ${pickupLocation}, ?, ?, ${destinationLocation}, ?, ?, ?, ?, ?, ?, ?)`,
            [
                driver.idUser, 
                createTripRequestDTO.pickupNeighborhood, 
                createTripRequestDTO.pickupText, 
                createTripRequestDTO.destinationNeighborhood, 
                createTripRequestDTO.destinationText, 
                availableSeats, 
                compensation.amount, 
                createTripRequestDTO.departureTime, 
                distance, 
                timeDifference, 
                observations, 
                vehicle.idVehicle
            ]
        );
    
        // Recuperar y devolver la solicitud de viaje creada
        const createdTrip = await this.tripRequestRepository.query(
            `SELECT * FROM trip_requests 
             WHERE idDriver = ? AND pickupNeighborhood = ? AND pickupText = ? AND destinationNeighborhood = ? AND destinationText = ? AND compensation = ? AND departureTime = ? AND observations = ?
             ORDER BY idTrip DESC LIMIT 1`,
            [
                driver.idUser,
                createTripRequestDTO.pickupNeighborhood,
                createTripRequestDTO.pickupText,
                createTripRequestDTO.destinationNeighborhood,
                createTripRequestDTO.destinationText,
                compensation.amount,
                createTripRequestDTO.departureTime,
                createTripRequestDTO.observations,
            ]
        );

        
        // Preparar la respuesta con toda la información requerida
        const response = {
            idTrip: createdTrip[0].idTrip,
            pickupNeighborhood: createdTrip[0].pickupNeighborhood,
            pickupText: createdTrip[0].pickupText,
            pickupLat,
            pickupLng,
            destinationNeighborhood: createdTrip[0].destinationNeighborhood,
            destinationText: createdTrip[0].destinationText,
            destinationLat,
            destinationLng,
            availableSeats: createdTrip[0].availableSeats,
            compensation: createdTrip[0].compensation,
            departureTime: createdTrip[0].departureTime,
            distance,
            timeDifference,
            observations: createdTrip[0].observations,
            idDriver: driver.idUser,
            driver: {
                name: driver.name,
                lastName: driver.lastName,
                phone: driver.phone,
                photo: driver.photoUser,
            },
            vehicle: {
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year,
                patent: vehicle.patent,
                color: vehicle.color,
            },
            reservations: [],
        };
    
        return response;
    }

    private async retryRequest<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === retries - 1) throw error;
                console.warn(`Retrying request (${attempt + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo antes de reintentar
            }
        }
    }
    // Método para reservar un asiento en un viaje
    async reserveSeat(tripRequestId: number, passengerId: number): Promise<TripReservation> {
        // Buscar la solicitud de viaje por ID y sus reservas relacionadas
        const tripRequest = await this.tripRequestRepository.findOne({
            where: { idTrip: tripRequestId },
            relations: ['reservations']
        });

        // Verificar si la solicitud de viaje existe
        if (!tripRequest) {
            throw new NotFoundException('Trip request not found');
        }

        // Verificar si hay asientos disponibles
        if (tripRequest.availableSeats <= 0) {
            throw new Error('No available seats');
        }

        // Buscar el pasajero por ID
        const passenger = await this.userRepository.findOne({ where: { idUser: passengerId }, relations: ['userRoles', 'userRoles.role'] });
        if (!passenger || !passenger.userRoles.some(userRole => userRole.role.idRole === 'PASSENGER' && userRole.status)) {
            throw new UnauthorizedException('Passenger not found or not authorized');
        }

        // Crear una nueva reserva para el pasajero en la solicitud de viaje
        const reservation = this.tripReservationRepository.create({
            tripRequest,
            passenger,
            reservationDate: new Date(), // Fecha actual como fecha de la reserva
        });

        // Reducir el número de asientos disponibles en la solicitud de viaje
        tripRequest.availableSeats -= 1;
        await this.tripRequestRepository.save(tripRequest); // Guardar la solicitud de viaje actualizada

        // Guardar la reserva y devolverla
        return this.tripReservationRepository.save(reservation);
    }

    // Método para actualizar las reservas de un viaje
    async updateTripReserves(tripRequestId: number): Promise<TripRequest> {
        // Buscar la solicitud de viaje por ID y sus reservas relacionadas
        const tripRequest = await this.tripRequestRepository.findOne({
            where: { idTrip: tripRequestId },
            relations: ['reservations']
        });

        // Verificar si la solicitud de viaje existe
        if (!tripRequest) {
            throw new NotFoundException('Trip request not found');
        }

        // Calcular el número de asientos reservados
        const reservedSeats = tripRequest.reservations.length;

        // Actualizar el número de asientos disponibles en la solicitud de viaje
        tripRequest.availableSeats -= reservedSeats;

        // Guardar y devolver la solicitud de viaje actualizada
        return this.tripRequestRepository.save(tripRequest);
    }

    async findAll(): Promise<TripRequest[]> {
        const trips = await this.tripRequestRepository.query(
            `SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
                    destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
                    availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
             FROM trip_requests`
        );
    
        const tripRequests = await Promise.all(trips.map(async (trip) => {
            if (trip.availableSeats <= 0) {
                return null; // Excluir viajes sin lugares disponibles
            }
    
            const driver = await this.userRepository.query(
                `SELECT name, lastName, phone, photoUser 
                 FROM users 
                 WHERE idUser = ?`,
                [trip.idDriver]
            );
    
            const driverDetails = driver.length ? driver[0] : { name: '', lastName: '', phone: '', photoUser: '' };
    
            const vehicle = await this.vehicleRepository.query(
                `SELECT idVehicle, brand, model, year, patent, color 
                 FROM vehicles 
                 WHERE idVehicle = ?`,
                [trip.vehicleId]
            );
    
            const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };
    
            const reservations = await this.tripReservationRepository.query(
                `SELECT idReservation, isPaid, idUser 
                 FROM trip_reservations 
                 WHERE tripRequestId = ?`,
                [trip.idTrip]
            );
    
            const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
                const passenger = await this.userRepository.query(
                    `SELECT name, lastName, phone 
                     FROM users 
                     WHERE idUser = ?`,
                    [reservation.idUser]
                );
    
                const passengerDetails = passenger.length ? passenger[0] : { name: '', lastName: '', phone: '' };
    
                return {
                    idReservation: reservation.idReservation,
                    isPaid: Boolean(reservation.isPaid),
                    passenger: {
                        idUser: reservation.idUser,
                        name: passengerDetails.name,
                        lastName: passengerDetails.lastName,
                        phone: passengerDetails.phone,
                    },
                };
            }));
    
    
            const { pickupLat, pickupLng } = this.parsePointPickup(trip.pickupLocation);
            const { destinationLat, destinationLng } = this.parsePointDestination(trip.destinationLocation);


            return {
                idTrip: trip.idTrip,
                pickupNeighborhood: trip.pickupNeighborhood,
                pickupText: trip.pickupText,
                pickupLat,
                pickupLng,
                destinationNeighborhood: trip.destinationNeighborhood,
                destinationText: trip.destinationText,
                destinationLat,
                destinationLng,
                availableSeats: trip.availableSeats,
                compensation: trip.compensation,
                departureTime: trip.departureTime,
                distance: trip.distance,
                timeDifference: trip.timeDifference,
                observations: trip.observations,
                idDriver: trip.idDriver,
                driver: driverDetails,
                vehicle: vehicleDetails,
                reservations: reservationsWithDetails
            };
        }));
    
        return tripRequests.filter(trip => trip !== null);
    }
    
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
    
    async findOne(idTrip: number): Promise<any> {
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
    
        const tripRequestEntity = trip[0];
    
        const driver = await this.userRepository.query(
            `SELECT name, lastName, phone, photoUser 
             FROM users 
             WHERE idUser = ?`,
            [tripRequestEntity.idDriver]
        );
    
        const driverDetails = driver.length ? driver[0] : { name: '', lastName: '', phone: '', photoUser: '' };
    
        const vehicle = await this.vehicleRepository.query(
            `SELECT idVehicle, brand, model, year, patent, color 
             FROM vehicles 
             WHERE idVehicle = ?`,
            [tripRequestEntity.vehicleId]
        );
    
        const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };
    
        const reservations = await this.tripReservationRepository.query(
            `SELECT idReservation, isPaid, idUser 
             FROM trip_reservations 
             WHERE tripRequestId = ?`,
            [idTrip]
        );
    
        const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
            const passenger = await this.userRepository.query(
                `SELECT name, lastName, phone 
                 FROM users 
                 WHERE idUser = ?`,
                [reservation.idUser]
            );
    
            const passengerDetails = passenger.length ? passenger[0] : { name: '', lastName: '', phone: '' };
    
            return {
                idReservation: reservation.idReservation,
                isPaid: Boolean(reservation.isPaid),
                passenger: {
                    idUser: reservation.idUser,
                    name: passengerDetails.name,
                    lastName: passengerDetails.lastName,
                    phone: passengerDetails.phone,
                },
            };
        }));
    
        const { pickupLat, pickupLng } = this.parsePointPickup(tripRequestEntity.pickupLocation);
        const { destinationLat, destinationLng } = this.parsePointDestination(tripRequestEntity.destinationLocation);

        return {
            idTrip: tripRequestEntity.idTrip,
            pickupNeighborhood: tripRequestEntity.pickupNeighborhood,
            pickupText: tripRequestEntity.pickupText,
            pickupLat,
            pickupLng,
            destinationNeighborhood: tripRequestEntity.destinationNeighborhood,
            destinationText: tripRequestEntity.destinationText,
            destinationLat,
            destinationLng,
            availableSeats: tripRequestEntity.availableSeats,
            compensation: tripRequestEntity.compensation,
            departureTime: tripRequestEntity.departureTime,
            distance: tripRequestEntity.distance,
            timeDifference: tripRequestEntity.timeDifference,
            observations: tripRequestEntity.observations,
            idDriver: tripRequestEntity.idDriver,
            driver: driverDetails,
            vehicle: vehicleDetails,
            reservations: reservationsWithDetails
        };
    }

    // Método para actualizar una solicitud de viaje por ID
    async updateTrip(idTrip: number, updateTripRequestDTO: UpdateTripRequestDTO): Promise<TripRequest> {
        const { vehicleId, pickupLat, pickupLng, destinationLat, destinationLng, observations, availableSeats, ...tripData } = updateTripRequestDTO;

        // Buscar la solicitud de viaje por ID y sus reservas relacionadas
        const tripRequest = await this.tripRequestRepository.findOne({
            where: { idTrip },
            relations: ['reservations'],
        });

        // Verificar si la solicitud de viaje existe
        if (!tripRequest) {
            throw new NotFoundException(`Solicitud de viaje con ID ${idTrip} no encontrada`);
        }

        // Obtener la hora de salida y la hora actual para calcular la diferencia de tiempo
        const departureTime = new Date(tripRequest.departureTime).getTime();
        const currentTime = Date.now();
        const timeDifference = departureTime - currentTime;

        // Verificar que la modificación se realice con más de una hora de anticipación
        if (timeDifference < 3600000) {
            throw new Error('No se puede modificar el viaje con menos de una hora de anticipación');
        }

        // Calcular el número de asientos reservados
        const reservedSeats = tripRequest.reservations.length;

        // Verificar que la cantidad de asientos disponibles no sea menor que la cantidad de asientos reservados
        if (availableSeats !== undefined && availableSeats < reservedSeats) {
            throw new Error(`No se puede establecer la cantidad de asientos disponibles a ${availableSeats}. Ya hay ${reservedSeats} asientos reservados.`);
        }

        // Definir las ubicaciones universitarias que no se pueden modificar
        const universityLocations = ["University A", "University B"];

        // Verificar si el lugar de recogida es una sede universitaria y si se está intentando modificar
        const isPickupUniversity = universityLocations.includes(tripRequest.pickupText);
        if (isPickupUniversity && (pickupLat !== undefined || pickupLng !== undefined)) {
            throw new Error('No se puede modificar el lugar de recogida ya que es una sede universitaria');
        }

        // Verificar si el lugar de destino es una sede universitaria y si se está intentando modificar
        const isDestinationUniversity = universityLocations.includes(tripRequest.destinationText);
        if (isDestinationUniversity && (destinationLat !== undefined || destinationLng !== undefined)) {
            throw new Error('No se puede modificar el lugar de destino ya que es una sede universitaria');
        }

        // Actualizar la ubicación de recogida si se proporciona
        if (pickupLat !== undefined && pickupLng !== undefined) {
            const pickupLocation = `ST_GeomFromText('POINT(${pickupLng} ${pickupLat})')`;
            await this.tripRequestRepository.query(
                `UPDATE trip_requests SET pickupLocation = ${pickupLocation} WHERE idTrip = ?`,
                [idTrip]
            );
        }

        // Actualizar la ubicación de destino si se proporciona
        if (destinationLat !== undefined && destinationLng !== undefined) {
            const destinationLocation = `ST_GeomFromText('POINT(${destinationLng} ${destinationLat})')`;
            await this.tripRequestRepository.query(
                `UPDATE trip_requests SET destinationLocation = ${destinationLocation} WHERE idTrip = ?`,
                [idTrip]
            );
        }

        // Actualizar el vehículo si se proporciona
        if (vehicleId) {
            const vehicle = await this.vehicleRepository.findOneBy({ idVehicle: vehicleId });
            if (!vehicle) {
                throw new NotFoundException('Vehículo no encontrado');
            }
            tripRequest.vehicle = vehicle;
        }

        // Actualizar las observaciones si se proporcionan
        if (observations !== undefined) {
            tripRequest.observations = observations;
        }

        // Actualizar la cantidad de asientos disponibles si se proporciona
        if (availableSeats !== undefined) {
            tripRequest.availableSeats = availableSeats;
        }

        // Asignar cualquier otra propiedad actualizada
        Object.assign(tripRequest, tripData);

        // Guardar y devolver la solicitud de viaje actualizada
        return this.tripRequestRepository.save(tripRequest);
    }

    // Método para eliminar una solicitud de viaje por ID
    async remove(idTrip: number): Promise<void> {
        const tripRequest = await this.findOne(idTrip);
        await this.tripRequestRepository.remove(tripRequest);
    }

    // Método para obtener la distancia y el tiempo entre dos puntos
    async getTimeAndDistanceClientRequest(
        originLat: number,
        originLng: number,
        destinationLat: number,
        destinationLng: number,
        departureTime: string,
        trafficModel: TrafficModel = TrafficModel.best_guess,
    ): Promise<DistanceMatrixResponseData> {
        try {
            let departureTimeInSeconds: number;
            if (departureTime === 'now') {
                departureTimeInSeconds = Math.floor(Date.now() / 1000);
            } else {
                const departureTimeValue = new Date(departureTime);
                if (isNaN(departureTimeValue.getTime())) {
                    throw new Error('Invalid departureTime');
                }
                departureTimeInSeconds = Math.floor(departureTimeValue.getTime() / 1000);
    
                // Verificar si la fecha es posterior al 31 de diciembre de 9999
                const maxTimeInSeconds = new Date('9999-12-31T23:59:59.999Z').getTime() / 1000;
                if (departureTimeInSeconds > maxTimeInSeconds) {
                    departureTimeInSeconds = maxTimeInSeconds;
                }
            }
    
            const response = await this.client.distancematrix({
                params: {
                    origins: [`${originLat},${originLng}`],
                    destinations: [`${destinationLat},${destinationLng}`],
                    mode: TravelMode.driving,
                    key: this.API_KEY,
                    departure_time: departureTimeInSeconds,
                    traffic_model: trafficModel,
                },
                timeout: 1000,
            });
    
            if (response.data.status !== 'OK') {
                throw new Error(`Error in Google Maps Distance Matrix API: ${response.data.status}`);
            }
    
            return response.data;
        } catch (error) {
            console.error('Error fetching distance matrix data:', error);
            throw new Error('Failed to fetch distance matrix data');
        }
    }

    // Método para encontrar solicitudes de viaje con filtros
    async findWithFilters(filters: any): Promise<TripRequest[]> {
        let query = `
            SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation,
                   destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation,
                   availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
            FROM trip_requests
            WHERE 1=1
        `;
    
        const queryParams = [];
    
        if (filters.startTime) {
            query += ` AND departureTime >= ?`;
            queryParams.push(filters.startTime);
        }
    
        if (filters.endTime) {
            query += ` AND departureTime <= ?`;
            queryParams.push(filters.endTime);
        }
    
        if (filters.universityName && filters.universityType) {
            if (filters.universityType === 'origin') {
                query += ` AND pickupText = ?`;
            } else if (filters.universityType === 'destination') {
                query += ` AND destinationText = ?`;
            }
            queryParams.push(filters.universityName);
        }
    
        const trips = await this.tripRequestRepository.query(query, queryParams);
    
        return trips.map(trip => ({
            ...trip,
            ...this.parsePointPickup(trip.pickupLocation),
            ...this.parsePointDestination(trip.destinationLocation),
        }));
    }

    // Método para encontrar todas las solicitudes de viaje ordenadas por cercanía y tiempo
    async findAllSorted(originLat: number, originLng: number): Promise<TripRequest[]> {
        const allTrips = await this.tripRequestRepository.query(`
            SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation,
                   destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation,
                   availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
            FROM trip_requests
        `);
    
        const originPoint = { type: 'Point', coordinates: [originLng, originLat] };
    
        return allTrips.map(trip => ({
            ...trip,
            ...this.parsePointPickup(trip.pickupLocation),
            ...this.parsePointDestination(trip.destinationLocation),
        })).sort((a, b) => {
            const distanceA = this.calculateDistance(
                originPoint.coordinates[1], originPoint.coordinates[0],
                a.pickupLocation.coordinates[1], a.pickupLocation.coordinates[0]
            );
            const distanceB = this.calculateDistance(
                originPoint.coordinates[1], originPoint.coordinates[0],
                b.pickupLocation.coordinates[1], b.pickupLocation.coordinates[0]
            );
    
            const timeA = new Date(a.departureTime).getTime();
            const timeB = new Date(b.departureTime).getTime();
            const currentTime = Date.now();
    
            const proximityA = distanceA + Math.abs(timeA - currentTime);
            const proximityB = distanceB + Math.abs(timeB - currentTime);
    
            return proximityA - proximityB;
        });
    }
    // Función auxiliar para calcular la distancia entre dos puntos geográficos utilizando la fórmula del haversine
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const p = 0.017453292519943295; // Constante para convertir grados a radianes (Math.PI / 180)
        const c = Math.cos;
        const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
        return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km (radio de la Tierra)
    }

    async findTripsByDriver(driverId: number): Promise<{ futureTrips: TripRequest[], pastTrips: TripRequest[] }> {
        const currentTime = new Date();

        // Consultar viajes futuros
        const futureTrips = await this.tripRequestRepository.query(
            `SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
                    destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
                    availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
             FROM trip_requests
             WHERE idDriver = ? AND departureTime >= ?`,
            [driverId, currentTime]
        );

        // Consultar viajes pasados
        const pastTrips = await this.tripRequestRepository.query(
            `SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
                    destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
                    availableSeats, compensation, departureTime, distance, timeDifference, observations, vehicleId
             FROM trip_requests
             WHERE idDriver = ? AND departureTime < ?`,
            [driverId, currentTime]
        );

        const futureTripsWithDetails = await Promise.all(futureTrips.map(async (trip) => {
            const { pickupLat, pickupLng } = this.parsePointPickup(trip.pickupLocation);
            const { destinationLat, destinationLng } = this.parsePointDestination(trip.destinationLocation);
            return this.getTripDetails(trip, pickupLat, pickupLng, destinationLat, destinationLng);
        }));

        const pastTripsWithDetails = await Promise.all(pastTrips.map(async (trip) => {
            const { pickupLat, pickupLng } = this.parsePointPickup(trip.pickupLocation);
            const { destinationLat, destinationLng } = this.parsePointDestination(trip.destinationLocation);
            return this.getTripDetails(trip, pickupLat, pickupLng, destinationLat, destinationLng);
        }));

        return {
            futureTrips: futureTripsWithDetails,
            pastTrips: pastTripsWithDetails,
        };
    }

    // Método auxiliar para obtener los detalles de un viaje
    private async getTripDetails(trip, pickupLat, pickupLng, destinationLat, destinationLng) {
        const driver = await this.userRepository.query(
            `SELECT idUser, name, lastName, phone, photoUser 
             FROM users 
             WHERE idUser = ?`,
            [trip.idDriver]
        );

        const driverDetails = driver.length ? driver[0] : { name: '', lastName: '', phone: '', photoUser: '' };

        const vehicle = await this.vehicleRepository.query(
            `SELECT idVehicle, brand, model, year, patent, color 
             FROM vehicles 
             WHERE idVehicle = ?`,
            [trip.vehicleId]
        );

        const vehicleDetails = vehicle.length ? vehicle[0] : { brand: '', model: '', year: '', patent: '', color: '' };

        const reservations = await this.tripReservationRepository.query(
            `SELECT idReservation, isPaid, idUser 
             FROM trip_reservations 
             WHERE tripRequestId = ?`,
            [trip.idTrip]
        );

        const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
            const passenger = await this.userRepository.query(
                `SELECT name, lastName, phone 
                 FROM users 
                 WHERE idUser = ?`,
                [reservation.idUser]
            );

            const passengerDetails = passenger.length ? passenger[0] : { name: '', lastName: '', phone: '' };

            return {
                idReservation: reservation.idReservation,
                isPaid: Boolean(reservation.isPaid),
                passenger: {
                    idUser: reservation.idUser,
                    name: passengerDetails.name,
                    lastName: passengerDetails.lastName,
                    phone: passengerDetails.phone,
                },
            };
        }));

        return {
            idTrip: trip.idTrip,
            pickupNeighborhood: trip.pickupNeighborhood,
            pickupText: trip.pickupText,
            pickupLat,
            pickupLng,
            destinationNeighborhood: trip.destinationNeighborhood,
            destinationText: trip.destinationText,
            destinationLat,
            destinationLng,
            availableSeats: trip.availableSeats,
            compensation: trip.compensation,
            departureTime: trip.departureTime,
            distance: trip.distance,
            timeDifference: trip.timeDifference,
            observations: trip.observations,
            idDriver: trip.idDriver,
            driver: driverDetails,
            vehicle: vehicleDetails,
            reservations: reservationsWithDetails
        };
    }
}
