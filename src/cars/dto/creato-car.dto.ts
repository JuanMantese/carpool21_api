import { IsNotEmpty, IsNumber, IsString, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";
@ValidatorConstraint({ async: false })
export class IsEightDigitsConstraint implements ValidatorConstraintInterface {
    validate(dniOwner: any, args: ValidationArguments) {
        const dniOwnerStr = dniOwner.toString();
        return dniOwnerStr.length === 8;  // Verifica que la longitud sea 8
    }

    defaultMessage(args: ValidationArguments) {
        return 'El número debe tener exactamente 8 dígitos.';  // Mensaje actualizado
    }
}

function IsEightDigits(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsEightDigitsConstraint,
        });
    };
}
export class CreateCarDTO {
    @IsNotEmpty()
    @IsString()
    brand: string;
    @IsNotEmpty()
    @IsString()
    model: string;
    @IsNotEmpty()
    @IsNumber()
    year: number;
    @IsNotEmpty()
    @IsString()
    patent: string;
    @IsNotEmpty()
    @IsString()
    greenCard: string;
    @IsNotEmpty()
    @IsNumber()
    @IsEightDigits({ message: 'El DNI debe tener 8 dígitos.' })
    dniOwner: number;
    @IsNotEmpty()
    @IsString()
    color: string;
}