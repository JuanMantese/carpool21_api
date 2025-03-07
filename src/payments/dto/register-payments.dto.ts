import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreatePaymentsDto {
  @IsNumber()
  tripId: number;
  
  @IsString()
  paymentMethod: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  saveNewCard?: boolean;

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
  @IsString()
  cvv?: number;
}