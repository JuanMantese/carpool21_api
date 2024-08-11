import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripReservation } from './trip_reservation.entity';
import { TripReservationService } from './trip_reservation.service';
import { TripReservationController } from './trip_reservation.controller';
import { TripRequest } from 'src/trip_request/trip_request.entity';
import { User } from 'src/users/users.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TripReservation, TripRequest, User, Vehicle])],
    providers: [TripReservationService],
    controllers: [TripReservationController],
})
export class TripReservationModule {}