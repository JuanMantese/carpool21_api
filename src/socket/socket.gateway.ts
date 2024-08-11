import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';


@WebSocketGateway({
    cors: {
        origin: '*'
    },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect{
    
    @WebSocketServer()
    server: Server;
    
    handleConnection(client: Socket, ...args: any[]) {
        console.log("Un usuario se ha conectado a SOCKET.IO.", client.id);
    }
    handleDisconnect(client: Socket) {
        console.log("Un usuario se ha desconectado de SOCKET.IO.", client.id);
    }
    @SubscribeMessage('message')
    handleMessage(@MessageBody() client: Socket, @MessageBody() data: any) {
        console.log('Nuevo mensaje: ', data);
        client.emit('new_message', 'Bien gracias');
    }

    @SubscribeMessage('change_driver_position')
    handleChangeDriverPosition(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
        console.log('EMITIO NUEVA POSICION: ', data);
        
        client.emit('new_driver_position', { id: data.id, lat: data.lat, lng: data.lng });
    }
}