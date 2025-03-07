import { IsNotEmpty, IsNumber, IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreateInsuranceDto {
  @IsNotEmpty()
  @IsNumber()
  idVehicle: number;

  @IsNotEmpty()
  @IsString()
  insuranceCompany: string;

  @IsNotEmpty()
  @IsString()
  insuranceType: string;

  @IsNotEmpty()
  @IsDateString()
  insuranceExpiration: string; 

  @IsNotEmpty()
  @IsNumber()
  policyNumber: number;

  @IsNotEmpty()
  @IsNumber()
  cuil_cuit: number;

  @IsBoolean()
  active: boolean;
}