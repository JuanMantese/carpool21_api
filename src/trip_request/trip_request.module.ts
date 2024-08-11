import { Module } from '@nestjs/common';
import { TripRequestController } from './trip_request.controller';
import { TripRequestService } from './trip_request.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripRequest } from './trip_request.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';
import { Compensation } from 'src/compensation/compensatio.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([TripRequest, Vehicle, TripReservation, User, Compensation]),
  ],
  providers: [TripRequestService],
  controllers: [TripRequestController],
  exports: [TripRequestService],
})
export class TripRequestModule {}
