import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car } from './cars.entity';
import { CreateCarDTO } from './dto/creato-car.dto';

@Injectable()
export class CarsService {
    constructor(
        @InjectRepository(Car) private carsRepository: Repository<Car>,
    ) {}

    create(carDTO: CreateCarDTO) {
        const newCar = this.carsRepository.create(carDTO);
        return this.carsRepository.save(newCar);
    }

    delete(id: number) {
        return this.carsRepository.delete(id);
    }

    async findCar(greenCard: string): Promise<Car | null> {
        return await this.carsRepository.findOneBy({ greenCard });
    }

}
