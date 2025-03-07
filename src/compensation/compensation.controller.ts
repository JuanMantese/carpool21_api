// compensation.controller.ts
import { Controller, Post, Get, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CompensationService } from './compensation.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';

@Controller('compensation')
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

  @Post() // POST /compensations
  create(@Body() createDto: CreateCompensationDto) {
    return this.compensationService.create(createDto);
  }

  @Get('findAll') // GET /compensations/findAll
  findAll() {
    return this.compensationService.findAll();
  }

  @Get(':idCompensation') // GET /compensations/:idCompensation
  findOne(@Param('idCompensation', ParseIntPipe) id: number) { // ParseIntPipe Convierte el idCompensation en number o devuelve 400 en caso de ser invalido
    return this.compensationService.findOne(id);
  }

  @Patch('update/:idCompensation')
  update(@Param('idCompensation') id: number, @Body() updateData: Partial<CreateCompensationDto>) {
    return this.compensationService.update(id, updateData);
  }

  @Delete('delete/:idCompensation')
  remove(@Param('idCompensation') id: number) {
    return this.compensationService.remove(id);
  }

  /** Calculo de la compensación de un viaje */
  @Post('calculate')
  async calculateCompensation(@Body() createCompensationDto: CreateCompensationDto) {
    return this.compensationService.calculateCompensation(createCompensationDto);
  }
}