import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTripReservationDTO {
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;
}