import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateCompensationDto {
  @IsOptional()
  @IsInt()
  idTrip: number;

  @IsPositive()
  distance: number; // en km

  @IsPositive()
  kmPerLitre: number; // km por litro

  @IsPositive()
  fuelPrice: number = 1000; // Precio del litro de combustible

  @IsPositive()
  availableSeats: number;
}