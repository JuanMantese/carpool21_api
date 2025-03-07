import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateCardsMockDto {
  @IsString()
  @Length(15, 16)
  @Matches(/^\d+$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  cardNumber: string;

  @IsString()
  ownerName: string;

  @IsString()
  @Matches(/^\d{4}\/\d{2}$/, { message: 'La fecha debe tener el formato YYYY/MM' })
  expirationDate: string;

  @IsInt()
  @Min(100)
  @Max(99999)
  cvv: number;
}