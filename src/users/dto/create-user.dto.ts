export class CreateUserDTO{
    name: string;
    lastName: string;
    studentFile: string;
    email: string;
    password: string;
    phone: number;
    dni: number;
    adress: string;
    contactPhone: number;
    contactName: string;
    contactLastName: string;
    roleActive?: string;
    stateValidation: boolean;
    active: boolean;
    photoUser?: string;
    notificationToken?: string;
}