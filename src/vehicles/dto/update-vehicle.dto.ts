import { IsOptional, IsString, Min, IsNumber } from 'class-validator';

export class UpdateVehicleDTO {
    @IsOptional()
    @IsString()
    color?: string;

}