import { IsAlphanumeric, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginAuthDTO {
    @IsNotEmpty()
    @IsEmail()
    @IsString()
    email: string;
    @IsNotEmpty()
    @IsAlphanumeric()
    @IsString()
    password: string;
}