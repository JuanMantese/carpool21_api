import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { RatingsModule } from './ratings/ratings.module';
import { SocketModule } from './socket/socket.module';
import { StudentsModule } from './students/students.module';
import { CarsModule } from './cars/cars.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversPositionModule } from './driver_position/driver_position.module';
import { TripRequestModule } from './trip_request/trip_request.module';
import { UniversityModule } from './university/university.module';
import { TripReservationModule } from './trip_reservation/trip_reservation.module';
import { CompensationModule } from './compensation/compensation.module';



@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, 
    }), 
    UsersModule, 
    AuthModule, 
    RolesModule, 
    RatingsModule, 
    SocketModule, 
    StudentsModule, 
    CarsModule, 
    VehiclesModule, 
    DriversPositionModule, 
    TripRequestModule, 
    UniversityModule, TripReservationModule, CompensationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}