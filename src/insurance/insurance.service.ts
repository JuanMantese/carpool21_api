import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { Insurance } from './insurance.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(Insurance)
    private insuranceRepository: Repository<Insurance>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
  ) {}

  async createOrUpdate(createInsuranceDto: CreateInsuranceDto): Promise<Insurance> {
    const { idVehicle } = createInsuranceDto;

    // Verificar si el vehículo existe
    const vehicle = await this.vehicleRepository.findOne({ where: { idVehicle } });
    if (!vehicle) throw new NotFoundException(`Vehículo con ID ${idVehicle} no encontrado`);

    // Buscar si ya existe un seguro asociado
    let existingInsurance = await this.insuranceRepository.findOne({ where: { idVehicle } });

    if (existingInsurance) {
      // Si existe, actualizar sus datos
      await this.insuranceRepository.update(existingInsurance.idInsurance, createInsuranceDto);
      return this.insuranceRepository.findOne({ where: { idInsurance: existingInsurance.idInsurance } });
    } else {
      // Si no existe, crearlo
      const newInsurance = this.insuranceRepository.create(createInsuranceDto);
      return this.insuranceRepository.save(newInsurance);
    }
  }

  async findAll(): Promise<Insurance[]> {
    return this.insuranceRepository.find({ relations: ['idVehiculo'] });
  }

  async findOne(id: number): Promise<Insurance> {
    return this.insuranceRepository.findOne({ where: { idInsurance: id }, relations: ['idVehiculo'] });
  }

  async remove(id: number): Promise<void> {
    await this.insuranceRepository.delete(id);
  }
}