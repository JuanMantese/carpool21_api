import { Body, Controller, Delete, Param, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { CreateCarDTO } from './dto/creato-car.dto';
import { CarsService } from './cars.service';
import { Car } from './cars.entity';


@Controller('cars')
export class CarsController {
    constructor(private carsService : CarsService) {}

    @Post('create')//http://localhost:3000/cars/create -> POST
    create(@Body() carDTO: CreateCarDTO) {
        return this.carsService.create(carDTO);
    }

    @Delete('delete/:id') //http://localhost:3000/cars/delete/:id -> Delete
    delete(@Body() id: number) {
        return this.carsService.delete(id);
    }   

    @Get('FindByGreenCard/:greenCard') // http://localhost:3000/cars/FindByGreenCard/:greenCard
    async findCar(@Param('greenCard') greenCard: string): Promise<Car | null> {
        return this.carsService.findCar(greenCard);
    }
}
