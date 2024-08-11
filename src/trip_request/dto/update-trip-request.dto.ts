import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class UpdateTripRequestDTO {
    @IsOptional()
    @IsNumber()
    vehicleId?: number;

    @IsOptional()
    @IsString()
    pickupNeighborhood?: string;

    @IsOptional()
    @IsString()
    pickupText?: string;

    @IsOptional()
    @IsNumber()
    pickupLat?: number;

    @IsOptional()
    @IsNumber()
    pickupLng?: number;

    @IsOptional()
    @IsString()
    destinationNeighborhood?: string;

    @IsOptional()
    @IsString()
    destinationText?: string;

    @IsOptional()
    @IsNumber()
    destinationLat?: number;

    @IsOptional()
    @IsNumber()
    destinationLng?: number;

    @IsOptional()
    @IsNumber()
    availableSeats?: number;

    @IsOptional()
    @IsDateString()
    departureTime?: string;

    @IsOptional()
    @IsNumber()
    distance?: number;

    @IsOptional()
    @IsString()
    timeDifference?: string;

    @IsOptional()
    @IsString()
    observations?: string; 
}