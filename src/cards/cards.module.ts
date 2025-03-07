import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Cards } from './cards.entity';
import { CardsMock } from 'src/cards_mock/cards-mock.entity';
import { User } from 'src/users/users.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([Cards, CardsMock, User]) ],
  controllers: [ CardsController ],
  providers: [ CardsService ],
  exports: [ CardsService ],
})
export class CardsModule {}