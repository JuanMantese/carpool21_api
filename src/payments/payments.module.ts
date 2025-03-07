import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { Payments } from './payments.entity';
import { PaymentsService } from './payments.service';
import { CardsMock } from 'src/cards_mock/cards-mock.entity';
import { CardsService } from 'src/cards/cards.service';
import { User } from 'src/users/users.entity';
import { CardsModule } from 'src/cards/cards.module';
import { Cards } from 'src/cards/cards.entity';

@Module({
  imports: [ 
    TypeOrmModule.forFeature([Payments, User, Cards, CardsMock]),
    CardsModule,
  ],
  controllers: [ PaymentsController ],
  providers: [ PaymentsService, CardsService ],
  exports: [ PaymentsService, CardsService ],
})
export class PaymentsModule {}