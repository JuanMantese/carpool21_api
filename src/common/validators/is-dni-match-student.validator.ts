import { Injectable } from "@nestjs/common";
import { ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";
import { RegisterAuthDTO } from "src/auth/dto/register-auth.dto";
import { StudentsService } from "src/students/students.service";

@ValidatorConstraint({ async: true })
@Injectable()
export class IsDniMatchStudent implements ValidatorConstraintInterface {
    constructor(private studentsService: StudentsService) {}

    async validate(dni: number, args: ValidationArguments) {
        const dto = args.object as RegisterAuthDTO;
        if (!dto.studentFile) {
            return false;
        }

        try {
            const student = await this.studentsService.findStudent(dto.studentFile);
            return student ? student.dniStudent === dni : false;
        } catch (error) {
            console.error('Error validando el DNI del estudiante:', error);
            return false;
        }
    }

    defaultMessage(args: ValidationArguments) {
        return 'El DNI no coincide con el DNI del legajo del estudiante proporcionado.';
    }
}

export function IsDniMatchStudentFile(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsDniMatchStudent,
        });
    };
}