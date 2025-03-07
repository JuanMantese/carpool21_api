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

  // Driver Position in Trip
  @SubscribeMessage('change_driver_position_trip')
  handleChangeDriverPositionTrip(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    console.log('Emitiendo NUEVA POSICION del Conductor en un Viaje: ', data);
    console.log(data.id_passenger);
    

    this.server.emit(`new_driver_position_trip/${data.id_passenger}`, { 
      id_socket: client.id, 
      lat: data.lat, 
      lng: data.lng 
    });
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
    console.log(data);

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