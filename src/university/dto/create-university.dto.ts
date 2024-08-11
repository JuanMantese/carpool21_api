import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUniversityDTO {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    universityNeighborhood: string;

    @IsNotEmpty()
    @IsNumber()
    latitude: number;

    @IsNotEmpty()
    @IsNumber()
    longitude: number;

    @IsNotEmpty()
    @IsString()
    universityDescription: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean; // Hacer que status sea opcional con un valor predeterminado en el servicio si no se proporciona
}
