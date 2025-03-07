import { Controller, Post, Get, Param, Body, Delete, Put } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';

@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /** Creación de un Seguro
   * POST http://localhost:3000/insurance
   * @param createInsuranceDto 
   * @returns 
   */
  @Post()
  createOrUpdate(@Body() createInsuranceDto: CreateInsuranceDto) {
    return this.insuranceService.createOrUpdate(createInsuranceDto);
  }

  /** Obtener todos los seguros
   * GET http://localhost:3000/insurance 
   */
  @Get()
  findAll() {
    return this.insuranceService.findAll();
  }

  /** Obtener un seguro por ID
   * GET http://localhost:3000/insurance/1 
   */
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.insuranceService.findOne(id);
  }

  /** Borrado Logico de un seguro por ID
   * DELETE http://localhost:3000/insurance/1
   * @param id 
   * @returns 
   */
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.insuranceService.remove(id);
  }
}