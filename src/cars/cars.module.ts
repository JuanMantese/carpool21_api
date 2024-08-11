import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Car } from './cars.entity';
import { IsGreenCardExistsConstraint } from '../common/validators/is-greenCard-exists.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Car])],
  controllers: [CarsController],
  providers: [IsGreenCardExistsConstraint, CarsService],
  exports: [CarsService, TypeOrmModule],
})
export class CarsModule {}
