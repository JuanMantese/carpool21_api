import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripState } from './trip_states.entity';
import { TripStatesService } from './trip_states.service';
import { TripStatesController } from './trip_states.controller';

@Module({
  imports: [ TypeOrmModule.forFeature([TripState]) ],
  providers: [ TripStatesService ],
  controllers: [ TripStatesController ],
  exports: [ TripStatesService ], // Si necesitas usarlo en otros módulos.
})
export class TripStatesModule {}