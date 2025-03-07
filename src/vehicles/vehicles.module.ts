import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicles.entity';
import { Car } from 'src/cars/cars.entity';
import { IsGreenCardExistsConstraint } from 'src/common/validators/is-greenCard-exists.validator';
import { CarsService } from 'src/cars/cars.service';
import { User } from 'src/users/users.entity';
import { Role } from 'src/roles/role.entity';
import { RolesService } from 'src/roles/roles.service';
import { UserVehicle } from 'src/users/userVehicles.entity';
import { UserRole } from 'src/users/userRole.entity';
import { InsuranceService } from 'src/insurance/insurance.service';
import { Insurance } from 'src/insurance/insurance.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([Vehicle, User, UserVehicle, UserRole, Role, Car, Insurance]) ],
  controllers: [ VehiclesController ],
  providers: [
    VehiclesService,
    IsGreenCardExistsConstraint, 
    CarsService, 
    RolesService, 
    InsuranceService
  ],
  exports: [ VehiclesService, TypeOrmModule ],
})
export class VehiclesModule {}
