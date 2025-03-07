import { Module } from '@nestjs/common';
import { TripRequestController } from './trip_request.controller';
import { TripRequestService } from './trip_request.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripRequest } from './trip_request.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';
import { Compensation } from 'src/compensation/compensation.entity';
import { TripState } from 'src/trip_states/trip_states.entity';
import { CompensationService } from 'src/compensation/compensation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripRequest, Vehicle, TripReservation, User, Compensation, TripState]),
  ],
  providers: [ TripRequestService, CompensationService ],
  controllers: [ TripRequestController ],
  exports: [ TripRequestService, CompensationService ],
})
export class TripRequestModule {}
