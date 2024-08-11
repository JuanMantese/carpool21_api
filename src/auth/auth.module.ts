import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt/jwt.constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { JwtStrategy } from './jwt/jwt.strategy';
import { RolesService } from 'src/roles/roles.service';
import { Role } from 'src/roles/role.entity';
import { Student } from 'src/students/students.entity';
import { StudentsModule } from 'src/students/students.module';
import { CarsModule } from '../cars/cars.module';
import { StudentsService } from 'src/students/students.service';
import { IsStudentFileExistsConstraint } from 'src/common/validators/is-student-file-exists.validator';
import { IsDniMatchStudent } from 'src/common/validators/is-dni-match-student.validator';
import { PassportModule } from '@nestjs/passport';
import { UserRole } from 'src/users/userRole.entity';
import { UserVehicle } from 'src/users/userVehicles.entity';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';

@Module({imports: [TypeOrmModule.forFeature([User, Role, Student, UserRole, UserVehicle]),
  StudentsModule,
  PassportModule,
  UsersModule,
  JwtModule.register({
    secret: jwtConstants.secret,
    signOptions: { expiresIn: '5h' },
  }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    RolesService, 
    JwtStrategy, 
    IsStudentFileExistsConstraint,
    IsDniMatchStudent,
    StudentsService,
    UsersService,

    
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
