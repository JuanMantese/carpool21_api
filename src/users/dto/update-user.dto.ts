import { IsNotEmpty, IsNumber, IsOptional, IsString, Length, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";

@ValidatorConstraint({ async: false })
class IsTenDigitsConstraint implements ValidatorConstraintInterface {
    validate(phone: any, args: ValidationArguments) {
        const phoneStr = phone.toString();
        return phoneStr.length === 10;  // Verifica que la longitud sea 10
    }

    defaultMessage(args: ValidationArguments) {
        return 'El número debe tener exactamente 10 dígitos.';
    }
}

function IsTenDigits(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTenDigitsConstraint,
        });
    };
}
export class UpdateUserDTO {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsString()
    lastName?: string;
    @IsOptional()
    @IsNumber()
    @IsTenDigits({ message: 'El celular debe tener 10 dígitos.' })
    phone?: number;
    @IsOptional()
    @IsString()
    address?: string;
    @IsOptional()
    @IsNumber()
    @IsTenDigits({ message: 'El celular debe tener 10 dígitos.' })
    contactPhone?: number;
    @IsOptional()
    @IsString()
    contactName?: string;
    @IsOptional()
    @IsString()
    contactLastName?: string;
    photoUser?: string;
    @IsOptional()
    @IsString()
    notificationToken?: string;
}