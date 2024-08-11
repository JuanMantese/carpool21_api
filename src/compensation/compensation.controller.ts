// src/compensation/compensation.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompensationService } from './compensation.service';

import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateCompensationDto } from './dto/create-compensatio.dto';

@Controller('compensations')
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

  @Post('create') // POST /compensations/create
  create(@Body() createCompensationDto: CreateCompensationDto) {
    return this.compensationService.create(createCompensationDto);
  }

  @Get('findAll') // GET /compensations/findAll
  findAll() {
    return this.compensationService.findAll();
  }

  @Get('findOne/:idCompensation') // GET /compensations/findOne/:idCompensation
  findOne(@Param('idCompensation') idCompensation: string) {
    return this.compensationService.findOne(+idCompensation);
  }

  @Patch('update/:idCompensation')
  update(@Param('idCompensation') idCompensation: string, @Body() updateCompensationDto: UpdateCompensationDto) {
    return this.compensationService.update(+idCompensation, updateCompensationDto);
  }

  @Delete('delete/:idCompensation')
  remove(@Param('idCompensation') idCompensation: string) {
    return this.compensationService.remove(+idCompensation);
  }
}
