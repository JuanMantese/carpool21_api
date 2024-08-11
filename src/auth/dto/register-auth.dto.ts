
import { IsAlphanumeric, IsEmail, IsNotEmpty, IsNumber, IsString, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";
import { IsDniMatchStudentFile } from "src/common/validators/is-dni-match-student.validator";
import { IsStudentFileExists } from "src/common/validators/is-student-file-exists.validator";

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

@ValidatorConstraint({ async: false })
class IsEightDigitsConstraint implements ValidatorConstraintInterface {
    validate(dni: any, args: ValidationArguments) {
        const dniStr = dni.toString();
        return dniStr.length === 8;  // Verifica que la longitud sea 8
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



export class RegisterAuthDTO{

    @IsNotEmpty()
    @IsString()
    name: string;
    @IsNotEmpty()
    @IsString()
    lastName: string;
    @IsNotEmpty()
    @IsString()
    @IsStudentFileExists({ message: 'El legajo del estudiante no existe o no cumple con los requisitos de Matriculación y/o regularidad.' })
    studentFile: string;
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;
    @IsNotEmpty()
    @IsAlphanumeric()
    @IsString()
    password: string;
    @IsNotEmpty()
    @IsNumber()
    @IsTenDigits({ message: 'El celular debe tener 10 dígitos.' })
    phone: number;
    @IsNotEmpty()
    @IsNumber()
    @IsEightDigits({ message: 'El DNI debe tener 8 dígitos.' })
    @IsDniMatchStudentFile({ message: 'El DNI no coincide con el dni del legajo del estudiante proporcionado.' })
    dni: number;
    @IsNotEmpty()
    @IsString()
    address: string;
    @IsNotEmpty()
    @IsNumber()
    @IsTenDigits({ message: 'El celular debe tener 10 dígitos.' })
    contactPhone: number;
    @IsNotEmpty()
    @IsString()
    contactName: string;
    @IsNotEmpty()
    @IsString()
    contactLastName: string;
    rolesId: string[];
}



