import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { TripRequestModule } from 'src/trip_request/trip_request.module';

@Module({
    imports: [ TripRequestModule ],
    providers: [ SocketGateway ],
})
export class SocketModule {}
