// src/compensation/compensation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationService } from './compensation.service';
import { CompensationController } from './compensation.controller';
import { Compensation } from './compensatio.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Compensation])],
  controllers: [CompensationController],
  providers: [CompensationService],
})
export class CompensationModule {}
