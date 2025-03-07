import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripState } from './trip_states.entity';

@Injectable()
export class TripStatesService {
  constructor(
    @InjectRepository(TripState)
    private tripStateRepository: Repository<TripState>,
  ) {}

  async findAll(): Promise<TripState[]> {
    return this.tripStateRepository.find();
  }

  async findOne(id: number): Promise<TripState> {
    return this.tripStateRepository.findOne({ where: { id } });
  }

  async create(name: string, description?: string): Promise<TripState> {
    const newState = this.tripStateRepository.create({ name, description });
    return this.tripStateRepository.save(newState);
  }
}