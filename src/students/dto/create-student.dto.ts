import { IsNotEmpty, IsNumber, IsString, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";
@ValidatorConstraint({ async: false })
export class IsEightDigitsConstraint implements ValidatorConstraintInterface {
    validate(dniStudent: any, args: ValidationArguments) {
        const dniStudentStr = dniStudent.toString();
        return dniStudentStr.length === 8;  // Verifica que la longitud sea 8
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
export class CreateStudentDTO {
    @IsNotEmpty()
    @IsString()
    name: string;
    @IsNotEmpty()
    @IsString()
    lastName: string;
    @IsNotEmpty()
    @IsString()
    studentFile: string;
    @IsNotEmpty()
    @IsNumber()
    @IsEightDigits({ message: 'El DNI debe tener 8 dígitos.' })
    dniStudent: number;
    @IsNotEmpty()
    @IsString()
    enrrolment: string;
    @IsNotEmpty()
    @IsString()
    regularity: string;
}