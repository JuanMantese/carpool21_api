import { Injectable, NotFoundException, UnauthorizedException, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { Client } from '@googlemaps/google-maps-services-js';
import { InjectRepository } from '@nestjs/typeorm';
import { TripRequest } from './trip_request.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { Repository } from 'typeorm';
import { CreateTripRequestDTO } from './dto/create-trip-request.dto';
import { UpdateTripRequestDTO } from './dto/update-trip-request.dto';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';
import { DistanceMatrixI } from './interfaces/trip_request.interface';
import { fetchDistanceMatrixData } from 'src/utils/google-maps/distance-matrix.util';
import { retryRequest } from 'src/utils/retry.utils';
import { parsePointPickup } from 'src/utils/google-maps/parse-point-pickup.util';
import { parsePointDestination } from 'src/utils/google-maps/parse-point-destination.util';
import { calculateDistance } from 'src/utils/google-maps/calculate-distance.util';
import { CompensationService } from 'src/compensation/compensation.service';
import { VehiclesService } from 'src/vehicles/vehicles.service';
import { TripReservationService } from 'src/trip_reservation/trip_reservation.service';

@Injectable()
export class TripRequestService extends Client{

  // Clave de API de Google Maps obtenida de las variables de entorno
  private readonly API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  // Cliente de Google Maps Services
  private readonly client = new Client({});

  constructor(
    @InjectRepository(TripRequest) private tripRequestRepository: Repository<TripRequest>,
    @InjectRepository(Vehicle) private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(TripReservation) private tripReservationRepository: Repository<TripReservation>,
    @InjectRepository(User) private userRepository: Repository<User>,

    // Usamos forwardRef para evitar circularidad
    @Inject(forwardRef(() => TripReservationService))
    private readonly tripTeservationService: TripReservationService,

    private readonly compensationService: CompensationService,
    private readonly vehicleService: VehiclesService,
  ) {
    super();
  }

  // Método para crear una nueva solicitud de viaje
  async create(createTripRequestDTO: CreateTripRequestDTO, idDriver: number): Promise<any> {
    const { 
      vehicleId, 
      pickupLat, 
      pickupLng, 
      destinationLat,
      destinationLng,
      availableSeats,
      observations,
      ...tripData 
    } = createTripRequestDTO;
      
    try {
      // Buscar el vehículo por ID
      const vehicle = await this.vehicleService.findOne(vehicleId);
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // Buscar el conductor por ID
      const driver = await this.userRepository.findOne({ where: { idUser: idDriver }, relations: ['userRoles', 'userRoles.role'] });
      if (!driver || !driver.userRoles.some(userRole => userRole.role.idRole === 'DRIVER' && userRole.status)) {
        throw new UnauthorizedException('Driver not found or not authorized');
      }

      // Calcular la distancia y el tiempo de viaje usando la API de Google Maps
      let distance: number;
      let timeDifference: number;

      try {
        const distanceMatrixResponse = await retryRequest(() => this.getTimeAndDistanceClientRequest(
          pickupLat, 
          pickupLng, 
          destinationLat, 
          destinationLng, 
          createTripRequestDTO.departureTime
        ));
        console.log('Distance Matrix Response:', distanceMatrixResponse);

        if (distanceMatrixResponse.distance && distanceMatrixResponse.duration) {
          distance = parseFloat((distanceMatrixResponse.distance.value / 1000).toFixed(1)); 
          timeDifference = Math.round(distanceMatrixResponse.duration.value / 60); 
        } else {
          throw new Error('Distance or duration data is missing or invalid in the response');
        }
      } catch (error) {
        console.error('Error in getTimeAndDistanceClientRequest:', error.message);
        throw new Error('Failed to fetch distance matrix data');
      }

    
      // Crear la consulta para las ubicaciones de recogida y destino utilizando ST_GeomFromText
      const pickupLocation = `ST_GeomFromText('POINT(${pickupLng} ${pickupLat})')`;
      const destinationLocation = `ST_GeomFromText('POINT(${destinationLng} ${destinationLat})')`;
      console.log(createTripRequestDTO);
    
      // Crear y guardar la solicitud de viaje utilizando una consulta bruta para las posiciones espaciales
      await this.tripRequestRepository.query(
        `INSERT INTO trip_requests (
          idDriver,
          pickupNeighborhood,
          pickupText,
          pickupLocation,
          destinationNeighborhood,
          destinationText,
          destinationLocation,
          availableSeats,
          departureTime,
          distance,
          timeDifference,
          observations,
          vehicleId,
          stateId
        )
        VALUES (?, ?, ?, ${pickupLocation}, ?, ?, ${destinationLocation}, ?, ?, ?, ?, ?, ?, ?)`,
        [
          driver.idUser, 
          createTripRequestDTO.pickupNeighborhood, 
          createTripRequestDTO.pickupText, 
          createTripRequestDTO.destinationNeighborhood, 
          createTripRequestDTO.destinationText, 
          availableSeats, 
          createTripRequestDTO.departureTime, 
          distance, 
          timeDifference, 
          observations, 
          vehicle.idVehicle,
          1 // CREATED status assigned in stateId
        ]
      );
    
      // Recuperar y devolver la solicitud de viaje creada
      const createdTrip = await this.tripRequestRepository.query(
        `SELECT * FROM trip_requests 
        WHERE idDriver = ? 
          AND pickupNeighborhood = ? 
          AND pickupText = ? 
          AND destinationNeighborhood = ? 
          AND destinationText = ? 
          AND departureTime = ? 
          AND observations = ?
        ORDER BY idTrip DESC LIMIT 1`,
        [
          driver.idUser,
          createTripRequestDTO.pickupNeighborhood,
          createTripRequestDTO.pickupText,
          createTripRequestDTO.destinationNeighborhood,
          createTripRequestDTO.destinationText,
          createTripRequestDTO.departureTime,
          createTripRequestDTO.observations,
        ]
      );

      console.log('Viaje creado');

      // Creando la Compensation Data
      const compensationData = {
        idTrip: createdTrip[0].idTrip, // Asignar el ID del viaje recién creado
        distance,
        // kmPerLitre: vehicle.kmPerLitre, // Suponiendo que el vehículo tiene un rendimiento registrado
        kmPerLitre: 10, // Suponiendo que el vehículo tiene un rendimiento registrado
        fuelPrice: 1000, // Se puede obtener dinámicamente de otro servicio
        availableSeats,
      };

      const compensation = await this.compensationService.create(compensationData);

      // **Actualizar el viaje con el ID de la compensación**
      await this.tripRequestRepository.query(
        `UPDATE trip_requests SET compensationId = ? WHERE idTrip = ?`,
        [compensation.idCompensation, createdTrip[0].idTrip]
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
        compensation: compensation.amount,
        departureTime: createdTrip[0].departureTime,
        distance,
        timeDifference,
        observations: createdTrip[0].observations,
        state: createdTrip[0].stateId,
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
          insuranceCompany: vehicle.insuranceCompany,
          insuranceType: vehicle.insuranceType,
          insuranceExpiration: vehicle.insuranceExpiration,
          policyNumber: vehicle.policyNumber,
          cuilCuit: vehicle.cuil_cuit,
        },
        reservations: [],
      };
  
      return response;
    } catch (error) {
      // Si ocurre un error, lanzamos una excepción con el código y mensaje
      console.error('Error occurred:', error.message);
      throw new HttpException(
        { 
          info: 'Error en la creación del viaje',
          message: error.message, 
          code: error.code || HttpStatus.INTERNAL_SERVER_ERROR 
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  async findAll(): Promise<TripRequest[]> {
    const trips = await this.tripRequestRepository.query(
      `SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
              destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
              availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId, stateId
      FROM trip_requests`
    );

    const tripRequests = await Promise.all(trips.map(async (trip) => {
      // Obtener el monto de la compensación si existe
      if (trip.compensationId) {
        const compensationData = await this.compensationService.findOne(trip.compensationId);
        trip.compensationId = compensationData ? compensationData.amount : 0;
      }

      const driver = await this.userRepository.query(
        `SELECT name, lastName, phone, photoUser 
          FROM users 
          WHERE idUser = ?`,
        [trip.idDriver]
      );

      const driverDetails = driver.length 
        ? {
          name: driver[0].name,
          lastName: driver[0].lastName,
          phone: driver[0].phone,
          photoUser: driver[0].photoUser
        } 
        : { name: '', lastName: '', phone: '', photoUser: '' };

      // Buscar el vehículo por ID
      const vehicleDetails = await this.vehicleService.findOne(trip.vehicleId);
      if (!vehicleDetails) {
        throw new NotFoundException('Vehicle not found');
      }

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

      const { pickupLat, pickupLng } = parsePointPickup(trip.pickupLocation);
      const { destinationLat, destinationLng } = parsePointDestination(trip.destinationLocation);

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
        compensation: trip.compensationId,
        departureTime: trip.departureTime,
        distance: trip.distance,
        timeDifference: trip.timeDifference,
        observations: trip.observations,
        state: trip.stateId,
        idDriver: trip.idDriver,
        driver: driverDetails,
        vehicle: vehicleDetails,
        reservations: reservationsWithDetails
      };
    }));

    return tripRequests.filter(trip => trip !== null);
  }


  async findAllAvailable(): Promise<TripRequest[]> {
    const currentDate = new Date(); // Obtener la fecha actual 
    const now = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString(); // Ajustando la fecha a mi Zona con formato ISO
    
    const trips = await this.tripRequestRepository.query(`
      SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
             destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
             availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId, stateId
      FROM trip_requests
      WHERE availableSeats > 0 AND departureTime > ?`, 
      [now]
    );

    const tripRequests = await Promise.all(trips.map(async (trip) => {
      // Obtener el monto de la compensación si existe
      if (trip.compensationId) {
        const compensationData = await this.compensationService.findOne(trip.compensationId);
        trip.compensationId = compensationData ? compensationData.amount : 0;
      }

      const driver = await this.userRepository.query(`
        SELECT name, lastName, phone, photoUser 
        FROM users 
        WHERE idUser = ?`,
        [trip.idDriver]
      );

      const driverDetails = driver.length 
        ? {
          name: driver[0].name,
          lastName: driver[0].lastName,
          phone: driver[0].phone,
          photoUser: driver[0].photoUser
        } 
        : { name: '', lastName: '', phone: '', photoUser: '' };

      // Buscar el vehículo por ID
      const vehicleDetails = await this.vehicleService.findOne(trip.vehicleId);
      if (!vehicleDetails) {
        throw new NotFoundException('Vehicle not found');
      }

      const reservations = await this.tripReservationRepository.query(`
        SELECT idReservation, isPaid, idUser 
        FROM trip_reservations 
        WHERE tripRequestId = ?`,
        [trip.idTrip]
      );

      const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
        const passenger = await this.userRepository.query(`
          SELECT name, lastName, phone 
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

      const { pickupLat, pickupLng } = parsePointPickup(trip.pickupLocation);
      const { destinationLat, destinationLng } = parsePointDestination(trip.destinationLocation);

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
        compensation: trip.compensationId,
        departureTime: trip.departureTime,
        distance: trip.distance,
        timeDifference: trip.timeDifference,
        observations: trip.observations,
        state: trip.stateId,
        idDriver: trip.idDriver,
        driver: driverDetails,
        vehicle: vehicleDetails,
        reservations: reservationsWithDetails
      };
    }));

    return tripRequests.filter(trip => trip !== null);
  }


  async findOne(idTrip: number): Promise<any> {
    /**
     * Obtiene los detalles de un viaje específico
     * Esta consulta realiza un `LEFT JOIN` con las tablas `users`, `vehicles` e `insurance` para obtener la información sobre el conductor del viaje, vehículo utilizado y los datos del seguro. 
     * 
     * @async @function
     * @param {number} idTrip - Identificador único del viaje a obtener.
     * @returns {Promise<Object[]>} - Una promesa que resuelve en un array con los detalles del viaje.
     */
    const tripData = await this.tripRequestRepository.query(`
      SELECT
        tr.idTrip, tr.idDriver, tr.pickupNeighborhood, tr.pickupText, 
        ST_AsWKT(tr.pickupLocation) as pickupLocation, 
        tr.destinationNeighborhood, tr.destinationText, 
        ST_AsWKT(tr.destinationLocation) as destinationLocation, 
        tr.availableSeats, tr.compensationId, tr.departureTime, 
        tr.distance, tr.timeDifference, tr.observations, tr.vehicleId, tr.stateId,
        u.name AS driverName, u.lastName AS driverLastName, 
        u.phone AS driverPhone, u.photoUser AS driverPhoto,
        v.idVehicle, v.brand, v.model, v.year, v.patent, v.color,
        i.insuranceCompany, i.insuranceType, i.insuranceExpiration, i.policyNumber, i.cuil_cuit
      FROM trip_requests tr
      LEFT JOIN users u ON tr.idDriver = u.idUser
      LEFT JOIN vehicles v ON tr.vehicleId = v.idVehicle
      LEFT JOIN insurance i ON v.idVehicle = i.idVehicle
      WHERE idTrip = ?`,
      [idTrip]
    );

    if (tripData.length === 0) {
      throw new NotFoundException(`Trip request with ID ${idTrip} not found`);
    }

    const tripRequestEntity = tripData[0];

    // Obtener el monto de la compensación si existe
    const compensation = tripRequestEntity.compensationId 
    ? await this.compensationService.findOne(tripRequestEntity.compensationId) 
    : { amount: 0 };
    
    // Obtener todas las reservas junto con los datos de los pasajeros en una sola consulta
    const reservations = await this.tripReservationRepository.query(`
      SELECT 
        r.idReservation, r.isPaid, r.idUser,
        u.name AS passengerName, u.lastName AS passengerLastName, u.phone AS passengerPhone
      FROM trip_reservations r
      LEFT JOIN users u ON r.idUser = u.idUser
      WHERE r.tripRequestId = ?
    `, [idTrip]);

    const reservationsWithDetails = reservations.map(reservation => ({
      idReservation: reservation.idReservation,
      isPaid: Boolean(reservation.isPaid),
      passenger: {
        idUser: reservation.idUser,
        name: reservation.passengerName,
        lastName: reservation.passengerLastName,
        phone: reservation.passengerPhone,
      },
    }));
  
    const { pickupLat, pickupLng } = parsePointPickup(tripRequestEntity.pickupLocation);
    const { destinationLat, destinationLng } = parsePointDestination(tripRequestEntity.destinationLocation);

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
      compensation: compensation.amount,
      departureTime: tripRequestEntity.departureTime,
      distance: tripRequestEntity.distance,
      timeDifference: tripRequestEntity.timeDifference,
      observations: tripRequestEntity.observations,
      state: tripRequestEntity.stateId,
      idDriver: tripRequestEntity.idDriver,
      driver: {
        name: tripRequestEntity.driverName,
        lastName: tripRequestEntity.driverLastName,
        phone: tripRequestEntity.driverPhone,
        photoUser: tripRequestEntity.driverPhoto,
      },
      vehicle: {
        idVehicle: tripRequestEntity.idVehicle,
        brand: tripRequestEntity.brand,
        model: tripRequestEntity.model,
        year: tripRequestEntity.year,
        patent: tripRequestEntity.patent,
        color: tripRequestEntity.color,
        insuranceCompany: tripRequestEntity.insuranceCompany || null,
        insuranceType: tripRequestEntity.insuranceType || null,
        insuranceExpiration: tripRequestEntity.insuranceExpiration || null,
        policyNumber: tripRequestEntity.policyNumber || null,
        cuilCuit: tripRequestEntity.cuil_cuit || null,
      },
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
  async remove(idTrip: number): Promise<any> {
    // Buscar la solicitud de viaje por ID y sus reservas relacionadas
    const tripRequest = await this.findOne(idTrip);

    // Verificar si la solicitud de viaje existe
    if (!tripRequest) {
      throw new NotFoundException(`Solicitud de viaje con ID ${idTrip} no encontrada`);
    }

    // Obtener la fecha actual para registrar la cancelación
    const cancellationDate = new Date();

    try {
      // Iniciar transacción para garantizar la consistencia
      await this.tripRequestRepository.manager.transaction(async (transactionalEntityManager) => {
        // Actualizar el estado del viaje y registrar la fecha de cancelación
        await transactionalEntityManager.query(`
          UPDATE trip_requests 
          SET stateId = ?, cancellationDate = ? 
          WHERE idTrip = ?`,
          [2, cancellationDate, idTrip]
        );

        // Cancelar todas las reservas asociadas
        if (tripRequest.reservations && tripRequest.reservations.length > 0) {
          for (const reservation of tripRequest.reservations) {
            this.tripTeservationService.cancelReservation(reservation.idReservation);
          }
        }
      });

      // if (result.affectedRows === 0) {
      //   throw new NotFoundException('Trip request not found or already updated');
      // }

      return { 
        message: 'Viaje cancelado exitosamente', 
        idTrip: Number(idTrip),
        newStatus: 2
      };
    } catch (error) {
      console.error('Error cencelando el viaje:', error);
      throw new HttpException(
        {
          message: 'No se pudo cancelar el viaje',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  // Método para obtener la distancia y el tiempo entre dos puntos
  async getTimeAndDistanceClientRequest(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
    departureTime: string,
  ): Promise<DistanceMatrixI> {
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

      // Llamar a la función externa
      const response = await fetchDistanceMatrixData(
        this.client,
        this.API_KEY,
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        departureTimeInSeconds,
      );

      const element = response.rows[0]?.elements[0];
      // Procesar los datos
      if (!element || element.status !== 'OK') {
        throw new Error(`Error in Distance Matrix API Element: ${element?.status || 'No data'}`);
      }

      return {
        distance: element.distance,
        duration: element.duration,
      };

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
              availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId, stateId
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
      ...parsePointPickup(trip.pickupLocation),
      ...parsePointDestination(trip.destinationLocation),
    }));
  }


  // Método para encontrar todas las solicitudes de viaje ordenadas por cercanía y tiempo
  async findAllSorted(originLat: number, originLng: number): Promise<TripRequest[]> {
    const allTrips = await this.tripRequestRepository.query(`
      SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation,
             destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation,
             availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId
      FROM trip_requests
    `);

    const originPoint = { type: 'Point', coordinates: [originLng, originLat] };
  
    return allTrips.map(trip => ({
      ...trip,
      ...parsePointPickup(trip.pickupLocation),
      ...parsePointDestination(trip.destinationLocation),
    })).sort((a, b) => {
      const distanceA = calculateDistance(
        originPoint.coordinates[1], originPoint.coordinates[0],
        a.pickupLocation.coordinates[1], a.pickupLocation.coordinates[0]
      );
      const distanceB = calculateDistance(
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


  async findTripsByDriver(driverId: number): Promise<{ futureTrips: TripRequest[], pastTrips: TripRequest[] }> {
    const currentTime = new Date();

    // Consultar viajes futuros
    const futureTrips = await this.tripRequestRepository.query(`
      SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
             destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
             availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId, stateId
      FROM trip_requests
      WHERE idDriver = ? AND departureTime >= ? AND stateId != 4`,
      [driverId, currentTime]
    );

    // Consultar viajes pasados
    const pastTrips = await this.tripRequestRepository.query(`
      SELECT idTrip, idDriver, pickupNeighborhood, pickupText, ST_AsWKT(pickupLocation) as pickupLocation, 
             destinationNeighborhood, destinationText, ST_AsWKT(destinationLocation) as destinationLocation, 
             availableSeats, compensationId, departureTime, distance, timeDifference, observations, vehicleId, stateId
      FROM trip_requests
      WHERE idDriver = ? AND (departureTime < ? OR stateId = 4)`,
      [driverId, currentTime]
    );

    const futureTripsWithDetails = await Promise.all(futureTrips.map(async (trip) => {
      const { pickupLat, pickupLng } = parsePointPickup(trip.pickupLocation);
      const { destinationLat, destinationLng } = parsePointDestination(trip.destinationLocation);
      return this.getTripDetails(trip, pickupLat, pickupLng, destinationLat, destinationLng);
    }));

    const pastTripsWithDetails = await Promise.all(pastTrips.map(async (trip) => {
      const { pickupLat, pickupLng } = parsePointPickup(trip.pickupLocation);
      const { destinationLat, destinationLng } = parsePointDestination(trip.destinationLocation);
      return this.getTripDetails(trip, pickupLat, pickupLng, destinationLat, destinationLng);
    }));

    return {
      futureTrips: futureTripsWithDetails,
      pastTrips: pastTripsWithDetails,
    };
  }


  // Método para actualizar el estado del viaje
  async updateTripStatus(idTrip: number, newStatus: number): Promise<any> {
    try {
      // Actualizar el estado del viaje en la base de datos
      const result = await this.tripRequestRepository.query(`
        UPDATE trip_requests 
        SET stateId = ? 
        WHERE idTrip = ?`,
        [newStatus, idTrip]
      );

      if (result.affectedRows === 0) {
        throw new NotFoundException('Trip request not found or already updated');
      }

      return { 
        message: 'Trip State updated successfully', 
        idTrip: Number(idTrip),
        newStatus 
      };
    } catch (error) {
      console.error('Error updating trip State:', error);
      throw new HttpException(
        {
          message: 'Failed to update trip State',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  /**
   * Obtiene las reservas de un viaje específico.
   *
   * @async @function
   * @param {number} idTrip - Identificador único del viaje.
   * @returns {Promise<Object[]>} - Una promesa que resuelve en un array con las reservas del viaje.
   */
  async findTripReserves(idTrip: number): Promise<any[]> {
    const reservations = await this.tripReservationRepository.query(`
      SELECT 
        r.idReservation, r.isPaid, r.idUser,
        u.name AS passengerName, u.lastName AS passengerLastName, u.phone AS passengerPhone
      FROM trip_reservations r
      LEFT JOIN users u ON r.idUser = u.idUser
      WHERE r.tripRequestId = ?
    `, [idTrip]);
  
    return reservations.map(reservation => ({
      idReservation: reservation.idReservation,
      isPaid: Boolean(reservation.isPaid),
      passenger: {
        idUser: reservation.idUser,
        name: reservation.passengerName,
        lastName: reservation.passengerLastName,
        phone: reservation.passengerPhone,
      },
    }));
  }


  // Método auxiliar para obtener los detalles de un viaje que utilizo en los otros servicios
  private async getTripDetails(
    trip: any,
    pickupLat: number,
    pickupLng: number,
    destinationLat: number,
    destinationLng: number
  ) {
    
    // Obtener el monto de la compensación si existe
    if (trip.compensationId) {
      const compensationData = await this.compensationService.findOne(trip.compensationId);
      trip.compensationId = compensationData ? compensationData.amount : 0;
    }

    const driver = await this.userRepository.query(`
      SELECT name, lastName, phone, photoUser 
      FROM users 
      WHERE idUser = ?`,
      [trip.idDriver]
    );

    const driverDetails = driver.length ? driver[0] : { name: '', lastName: '', phone: '', photoUser: '' };

    // Buscar el vehículo por ID
    const vehicleDetails = await this.vehicleService.findOne(trip.vehicleId);
    if (!vehicleDetails) {
      throw new NotFoundException('Vehicle not found');
    }

    const reservations = await this.tripReservationRepository.query(`
      SELECT idReservation, isPaid, idUser 
      FROM trip_reservations 
      WHERE tripRequestId = ?`,
      [trip.idTrip]
    );

    const reservationsWithDetails = await Promise.all(reservations.map(async (reservation) => {
      const passenger = await this.userRepository.query(`
        SELECT name, lastName, phone 
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
      compensation: trip.compensationId,
      departureTime: trip.departureTime,
      distance: trip.distance,
      timeDifference: trip.timeDifference,
      observations: trip.observations,
      state: trip.stateId,
      idDriver: trip.idDriver,
      driver: driverDetails,
      vehicle: vehicleDetails,
      reservations: reservationsWithDetails
    };
  }
}
