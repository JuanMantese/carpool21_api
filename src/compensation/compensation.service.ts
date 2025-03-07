// src/compensation/compensation.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { Compensation } from './compensation.entity';
import { CreateCompensationDto } from './dto/create-compensation.dto';

@Injectable()
export class CompensationService {
  constructor(
    @InjectRepository(Compensation)
    private compensationRepository: Repository<Compensation>,
  ) {}

  async create(createDto: CreateCompensationDto): Promise<Compensation> {

    // Costo del combustible
    const fuelCost = (createDto.distance / createDto.kmPerLitre) * createDto.fuelPrice;
    const totalAmount = (fuelCost + 1200) / createDto.availableSeats;
    
    const compensation = this.compensationRepository.create({
      idTrip: createDto.idTrip, // Asociando viaje a la compensacion
      amount: totalAmount,
      ratePerKm: fuelCost / createDto.distance,
      createdAt: new Date(),
      active: true,
    });
    return this.compensationRepository.save(compensation);
  }

  async findAll(): Promise<Compensation[]> {
    return this.compensationRepository.find();
  }

  async findOne(id: number): Promise<Compensation> {
    const compensation = await this.compensationRepository.findOne({
      where: { idCompensation: id },
    });
  
    if (!compensation) {
      throw new NotFoundException(`Compensation with ID ${id} not found`);
    }
    return compensation;
  }

  async update(id: number, updateCompensationDto: UpdateCompensationDto): Promise<Compensation> {
    const compensation = await this.findOne(id);

    Object.assign(compensation, updateCompensationDto);

    return this.compensationRepository.save(compensation);
  }

  async remove(id: number): Promise<void> {
    const compensation = await this.findOne(id);
    if (!compensation) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'COMPENSATION_NOT_FOUND',
        message: 'La compensación no existe o los datos no coinciden',
      });
    }
    await this.compensationRepository.remove(compensation);
  }

  async calculateCompensation(createCompensationDto: CreateCompensationDto) {
    const { distance, kmPerLitre, availableSeats } = createCompensationDto;
    const priceBusTicket = 1200;
    const fuelCost = (distance / kmPerLitre) * 1000;
    const totalAmount = (fuelCost + priceBusTicket) / availableSeats;
    return { totalAmount };
  }
}
