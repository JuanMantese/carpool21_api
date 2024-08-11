import { IsBoolean, IsNotEmpty, IsNumber } from "class-validator";

export class CreateTripReservationDTO {
    @IsNotEmpty()
    @IsNumber()
    tripRequestId: number;

    @IsBoolean()
    @IsNotEmpty()
    isPaid: boolean;
}