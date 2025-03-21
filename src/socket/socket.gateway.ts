import { 
  WebSocketGateway, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  WebSocketServer, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket 
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { TripRequestService } from "src/trip_request/trip_request.service";

@WebSocketGateway({
  cors: {
    origin: '*'
  },
  transports: ['websocket']
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    
  // OnGatewayConnection - Permite controlar los usuarios que se van conectando al Socket
  // OnGatewayDisconnect - Permite controlar los usuarios que se van desconectando del Socket

  constructor(private readonly tripService: TripRequestService) {} 

  @WebSocketServer()
  server: Server;
  
  handleConnection(client: Socket, ...args: any[]) {
    console.log("Un usuario se ha conectado a SOCKET.IO -", client.id);
  }
  handleDisconnect(client: Socket) {
    console.log("Un usuario se ha desconectado de SOCKET.IO -", client.id);
  }

  // Evento de Prueba
  @SubscribeMessage('message') // ID = message
  handleMessage( @MessageBody() data: any) {
    console.log('Nuevo mensaje: ', data);
    
    // Respuesta al recibir el evento que ejecuta 'message'
    this.server.emit('new_message_response', 'Bien gracias');
  }

  // Driver Position
  @SubscribeMessage('change_driver_position')
  handleChangeDriverPosition(@MessageBody() data: any) {
    console.log('Emitiendo NUEVA POSICION del Conductor: ', data);
    
    this.server.emit('new_driver_position', { 
      id: data.id, 
      lat: data.lat, 
      lng: data.lng 
    });
  }

  /**
   * Maneja la actualización de la posición del conductor en un viaje y la emite la posicion a un pasajero específico.
   * 
   * @param {Socket} client - El socket del conductor que envía su nueva posición.
   * @param {Object} data - Datos de la nueva posición del conductor.
   * @param {string} data.trip_id - Identificador del viaje para obtener las reservas y los pasajeros a los que se les notificará la nueva posición del conductor.
   * @param {number} data.lat - Latitud de la nueva posición del conductor.
   * @param {number} data.lng - Longitud de la nueva posición del conductor.
   * 
   * @emits `new_driver_position_trip/{id_passenger}` - Evento que notifica al pasajero la nueva posición del conductor.
   */
  @SubscribeMessage('change_driver_position_trip')
  async handleChangeDriverPositionTrip(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log('Emitiendo NUEVA POSICION del Conductor en un Viaje: ', data);
    
    const tripId = data.trip_id; // Se debe enviar el ID del viaje en el evento
    if (!tripId) {
      console.error('Error: trip_id no proporcionado');
      return;
    }

    try {
      // Obtener los pasajeros del viaje
      const reserves = await this.tripService.findTripReserves(tripId);
  
      if (!reserves || reserves.length === 0) {
        console.error('Error: No hay reserves en este viaje');
        return;
      }
  
      // Emitir a todos los pasajeros que tienen reserva en el viaje
      reserves.forEach(reserve => {
        this.server.emit(`new_driver_position_trip/${reserve.passenger.idUser}`, { 
          id_socket: client.id, 
          lat: data.lat, 
          lng: data.lng 
        });
      });
    } catch (error) {
      console.error('Error al obtener pasajeros:', error);
    }
  }

  // Cambio de estado del viaje
  // Emitiendo NOTIFICACIÓN cuando un viaje cambia de estado
  @SubscribeMessage('update_status_trip')
  async handleUpdateStatusTrip(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log('Emitiendo NOTIFICACIÓN de cambio de estado del viaje: ', data);

    const tripId = data.trip_id; // ID del viaje que cambió de estado
    if (!tripId) {
      console.error('Error: trip_id no proporcionado');
      return;
    }

    try {
      // Obtener los pasajeros con reserva en este viaje
      const tripDetail = await this.tripService.findOne(tripId);
  
      if (!tripDetail || tripDetail.reservations.length === 0) {
        console.error('Error: No hay reservas en este viaje');
        return;
      }
      
      console.log('El estado del viaje ha cambiado');
      console.log(tripDetail.state);
      console.log(tripDetail.state === 3);

      
      if (tripDetail.state === 3) {
        // Emitir a todos los pasajeros que tienen reserva en el viaje que el mismo a comenzado
        tripDetail.reservations.forEach(reserve => {
          this.server.emit(`trip_status_start/${reserve.passenger.idUser}`, { 
            id_socket: client.id,
            trip_id: tripId,
            state: tripDetail.state
          });
        });
        console.log('Emitiendo');
        
      } else {
        // Emitir a todos los pasajeros que tienen reserva en el viaje que el mismo a finalizado
        tripDetail.reservations.forEach(reserve => {
          this.server.emit(`trip_status_update/${reserve.passenger.idUser}`, { 
            id_socket: client.id,
            trip_id: tripId,
            state: tripDetail.state
          });
        });
        console.log('NO Emitido');

      }

    } catch (error) {
      console.error('Error al obtener pasajeros:', error);
    }
  }


  // New Trip Offer
  @SubscribeMessage('new_trip_offer')
  handleNewTrip(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log('Emitiendo NUEVO VIAJE del Conductor: ', data);
    
    this.server.emit('created_trip_notification', { 
      id_socket: client.id, 
      id_driver_request: data.id_driver_request 
    });
  }

  // Creando un canal unico para cada usario - Servicio de Notificaciones
  @SubscribeMessage('join_user')
  handleJoinConductor(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const { userId } = data;
    client.join(`user_${userId}`);
    console.log(`user ${userId} se unió a su sala personalizada.`);
  }

  // New Reserve on Trip
  @SubscribeMessage('new_reserve_trip')
  async handleNewReserveTrip(
    @ConnectedSocket() client: Socket, 
    @MessageBody() data: any
  ) {
    console.log('Emitiendo NUEVA RESERVA de un viaje del Pasajero: ', data);
    console.log('Payload recibido:', typeof data);

    try {

      // Validar que los datos sean un objeto JSON válido en caso de llegar como String
      if (typeof data === 'string') {
        data = JSON.parse(data);
        console.log(data);  
      }

      const { id_passenger, id_trip, id_passenger_request } = data;
      console.log(id_passenger_request);
      
      // Validando datos no nulos
      if (!id_trip || !id_passenger_request) {
        console.error('Datos incompletos: id_trip o id_passenger_request faltantes.');
        return;
      }

      // Aquí puedes agregar una lógica para buscar los detalles del viaje y del conductor
      const tripDetail = await this.tripService.findOne(id_trip); // Ejemplo de llamada al servicio
      if (!tripDetail) {
        console.error(`El viaje con ID ${id_trip} no existe.`);
        return;
      }

      const idDriver = tripDetail.idDriver; // Supongamos que el viaje tiene el ID del conductor

      if (!idDriver) {
        console.error(`El viaje con ID ${id_trip} no tiene un conductor asignado.`);
        return;
      }
      
      // Emitiendo al conductor la notificación de reserva creada para Notificacion Push
      this.server.to(`user_${idDriver}`).emit('new_reserve_trip_notification', {
        id_trip,
        id_passenger_request,
        message: `Se ha realizado una nueva reserva en el viaje Nro ${id_trip}.`,
      });


      // Emitiendo al conductor la notificación de nueva reserva creada en un viaje especifico
      this.server.emit(`create_reserve_trip_notification/${idDriver}/${id_trip}`, { 
        id_socket: client.id, 
        id_passenger_request: data.id_passenger_request,
        message: `Se ha realizado una nueva reserva en su viaje ${id_trip}.`,
      });

      // Emitiendo al pasajero la notificacion de reserva creada para actualizar el Historial de Reservas
      this.server.emit(`reserves_all_changed_notification/${id_passenger}`, { 
        id_socket: client.id, 
        id_passenger_request: data.id_passenger_request,
        message: 'Se ha actualizado el historial de reservas.',
      });

    } catch (error) {
      console.error('Error al procesar el Socket de la Reserva:', error);
      return;
    }
  }
}