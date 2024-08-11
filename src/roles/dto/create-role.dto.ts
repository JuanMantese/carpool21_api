import { IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDTO {
    @IsNotEmpty()
    @IsString()
    idRole: string;
    @IsNotEmpty()
    @IsString()
    name: string;
    @IsString()
    route: string;
    active?: boolean;
}