import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCompensationDto {
    @IsString()
    name: string;
  
    @IsNumber()
    amount: number;
  
    @IsBoolean()
    @IsOptional()
    status?: boolean;
  }