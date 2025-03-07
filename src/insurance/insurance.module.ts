import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { Insurance } from './insurance.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([Insurance, Vehicle]) ],
  controllers: [ InsuranceController ],
  providers: [ InsuranceService ],
  exports: [ InsuranceService, TypeOrmModule ],
})
export class InsuranceModule {}