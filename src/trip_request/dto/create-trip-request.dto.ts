import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateTripRequestDTO {
    @IsNotEmpty()
    @IsString()
    pickupNeighborhood: string;

    @IsNotEmpty()
    @IsString()
    pickupText: string;

    @IsNotEmpty()
    @IsNumber()
    pickupLat: number;

    @IsNotEmpty()
    @IsNumber()
    pickupLng: number;

    @IsNotEmpty()
    @IsString()
    destinationNeighborhood: string;

    @IsNotEmpty()
    @IsString()
    destinationText: string;

    @IsNotEmpty()
    @IsNumber()
    destinationLat: number;

    @IsNotEmpty()
    @IsNumber()
    destinationLng: number;

    @IsNotEmpty()
    @IsNumber()
    availableSeats: number;

    //@IsNotEmpty()
    //@IsNumber()
    //compensation: number;

    @IsNotEmpty()
    @IsString()
    departureTime: string;

    @IsOptional()
    @IsNumber()
    distance?: number;

    @IsOptional()
    @IsString()
    timeDifference?: string;

    @IsOptional()
    @IsString()
    observations?: string;

    @IsNotEmpty()
    @IsNumber()
    vehicleId: number;
}