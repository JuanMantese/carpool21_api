import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CardsMockService } from './cards-mock.service';
import { CreateCardsMockDto } from './dto/create-cards-mock.dto';

@Controller('cards-mock')
export class CardsMockController {
  constructor(private readonly cardsMockService: CardsMockService) {}

  @Post()
  create(@Body() createCardsMockDto: CreateCardsMockDto) {
    return this.cardsMockService.create(createCardsMockDto);
  }

  @Get()
  findAll() {
    return this.cardsMockService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardsMockService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardsMockService.remove(+id);
  }
}