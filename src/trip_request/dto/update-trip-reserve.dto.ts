import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTripReserveDTO {
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @IsOptional()
    @IsBoolean()
    cancellationDate?: Date;
}