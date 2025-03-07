import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TripStatesService } from './trip_states.service';

@Controller('trip-states')
export class TripStatesController {
  constructor(private readonly tripStatesService: TripStatesService) {}

  @Get()
  async getAllStates() {
    return this.tripStatesService.findAll();
  }

  @Get(':id')
  async getState(@Param('id') id: number) {
    return this.tripStatesService.findOne(id);
  }

  @Post()
  async createState(
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.tripStatesService.create(name, description);
  }
}