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

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, User, UserVehicle, UserRole, Role, Car]),],
  controllers: [VehiclesController],
  providers: [VehiclesService,IsGreenCardExistsConstraint, CarsService, RolesService],
  exports: [VehiclesService, TypeOrmModule],
})
export class VehiclesModule {}
