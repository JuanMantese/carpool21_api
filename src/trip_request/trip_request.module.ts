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
import { VehiclesService } from 'src/vehicles/vehicles.service';
import { VehiclesModule } from 'src/vehicles/vehicles.module';
import { InsuranceService } from 'src/insurance/insurance.service';
import { TripReservationService } from 'src/trip_reservation/trip_reservation.service';
import { PaymentsService } from 'src/payments/payments.service';
import { PaymentsModule } from 'src/payments/payments.module';
import { Payments } from 'src/payments/payments.entity';
import { Cards } from 'src/cards/cards.entity';
import { CardsMock } from 'src/cards_mock/cards-mock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripRequest, Vehicle, TripReservation, User, Compensation, TripState, Payments, Cards, CardsMock]),
    VehiclesModule,
    PaymentsModule
  ],
  providers: [ TripRequestService, CompensationService, VehiclesService, InsuranceService, PaymentsService, TripReservationService ],
  controllers: [ TripRequestController ],
  exports: [ TripRequestService, CompensationService ],
})
export class TripRequestModule {}
