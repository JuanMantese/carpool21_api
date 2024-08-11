import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRoleType {
    PASSENGER = 'PASSENGER',
    DRIVER = 'DRIVER',
}

export class ChangeUserRoleDTO {
    @IsNotEmpty()
    @IsEnum(UserRoleType, { message: 'idRole must be either PASSENGER or DRIVER' })
    idRole: UserRoleType;
}