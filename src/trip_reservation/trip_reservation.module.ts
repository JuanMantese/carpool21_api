import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripReservation } from './trip_reservation.entity';
import { TripReservationService } from './trip_reservation.service';
import { TripReservationController } from './trip_reservation.controller';
import { TripRequest } from 'src/trip_request/trip_request.entity';
import { User } from 'src/users/users.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripRequestService } from 'src/trip_request/trip_request.service';
import { TripRequestModule } from 'src/trip_request/trip_request.module';
import { CompensationService } from 'src/compensation/compensation.service';
import { Compensation } from 'src/compensation/compensation.entity';
import { Cards } from 'src/cards/cards.entity';
import { CardsMock } from 'src/cards_mock/cards-mock.entity';
import { PaymentsService } from 'src/payments/payments.service';
import { Payments } from 'src/payments/payments.entity';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [ 
    TypeOrmModule.forFeature([TripReservation, TripRequest, User, Vehicle, Compensation, Payments, Cards, CardsMock ]),
    TripRequestModule, // 🔹 Importamos el módulo para que CompensationService esté disponible
    PaymentsModule
  ],
  providers: [ TripReservationService, TripRequestService, CompensationService, PaymentsService ],
  controllers: [ TripReservationController ],
})
export class TripReservationModule {}