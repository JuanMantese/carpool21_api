import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardsDto } from './dto/create-cards.dto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post(':userId')
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createCardsDto: CreateCardsDto
  ) {
    return this.cardsService.create(userId, createCardsDto);
  }

  @Get()
  findAll() {
    return this.cardsService.findAll();
  }

  @Get('findOne/:cardId')
  findOne(@Param('cardId') cardId: string) {
    return this.cardsService.findOne(+cardId);
  }

  @Get('findAllByUser/:userId')
  findAllByUser(@Param('userId') userId: number) {
    return this.cardsService.findAllByUser(userId);
  }

  @Get(':userId/:cardId')
  findCardByUser(
    @Param('userId') userId: number,
    @Param('cardId') cardId: number
  ) {
    return this.cardsService.findCardByUser(userId, cardId);
  }

  @Delete(':userId')
  remove(@Param('userId') id: string) {
    return this.cardsService.remove(+id);
  }
}