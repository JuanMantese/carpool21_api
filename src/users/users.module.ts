import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { JwtStrategy } from 'src/auth/jwt/jwt.strategy';
import { Role } from 'src/roles/role.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { UserRole } from './userRole.entity';
import { UserVehicle } from './userVehicles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, UserVehicle, Role, Vehicle]),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
  exports: [TypeOrmModule, UsersService]
})
export class UsersModule {}
