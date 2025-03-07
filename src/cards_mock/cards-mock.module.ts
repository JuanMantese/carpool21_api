import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsMockService } from './cards-mock.service';
import { CardsMockController } from './cards-mock.controller';
import { CardsMock } from './cards-mock.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([CardsMock]) ],
  controllers: [ CardsMockController ],
  providers: [ CardsMockService ],
  exports: [ CardsMockService ]
})
export class CardsMockModule {}