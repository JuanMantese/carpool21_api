import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { User } from 'src/users/users.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { UserRole } from 'src/users/userRole.entity';

@Module({imports: [TypeOrmModule.forFeature([Role, User, Vehicle, UserRole])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
