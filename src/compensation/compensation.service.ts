// src/compensation/compensation.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { Compensation } from './compensatio.entity';
import { CreateCompensationDto } from './dto/create-compensatio.dto';

@Injectable()
export class CompensationService {
  constructor(
    @InjectRepository(Compensation)
    private compensationRepository: Repository<Compensation>,
  ) {}

  async create(createCompensationDto: CreateCompensationDto): Promise<Compensation> {
    const compensation = this.compensationRepository.create(createCompensationDto);
    return this.compensationRepository.save(compensation);
  }

  async findAll(): Promise<Compensation[]> {
    return this.compensationRepository.find();
  }

  async findOne(id: number): Promise<Compensation> {
    const compensation = await this.compensationRepository.findOne({ where: { id } });
    if (!compensation) {
      throw new NotFoundException(`Compensation with ID ${id} not found`);
    }
    return compensation;
  }

  async update(id: number, updateCompensationDto: UpdateCompensationDto): Promise<Compensation> {
    await this.compensationRepository.update(id, updateCompensationDto);
    const updatedCompensation = await this.compensationRepository.findOne({ where: { id } });
    if (!updatedCompensation) {
      throw new NotFoundException(`Compensation with ID ${id} not found`);
    }
    return updatedCompensation;
  }

  async remove(id: number): Promise<void> {
    const compensation = await this.findOne(id);
    await this.compensationRepository.remove(compensation);
  }
}
