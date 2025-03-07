import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTripReservationDTO {
  @IsNotEmpty()
  @IsNumber()
  tripRequestId: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;  // CASH - OtherCard o ID de la Tarjeta con la que va a pagar el usuario

  // Opcionales, solo se usan si el pago es con tarjeta
  @IsOptional()
  @IsBoolean()
  saveNewCard?: boolean = false;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  expirationDate?: string;

  @IsOptional()
  @IsNumber()
  cvv?: number;
}