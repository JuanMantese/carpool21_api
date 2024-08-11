import { Module } from '@nestjs/common';
import { DriversPositionController } from './driver_position.controller';
import { DriversPositionService } from './driver_position.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { DriversPosition } from './driver_position.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ DriversPosition, User ]) ],
  providers: [DriversPositionService],
  controllers: [DriversPositionController],
  exports: [DriversPositionService]
})
export class DriversPositionModule {}
