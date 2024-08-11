import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { StudentsService } from 'src/students/students.service';



@ValidatorConstraint({ async: true })
@Injectable()
export class IsStudentFileExistsConstraint implements ValidatorConstraintInterface {
    constructor(private studentsService: StudentsService) {}

    async validate(studentFile: string, args: ValidationArguments) {
        try {
            const student = await this.studentsService.findStudent(studentFile);
            return !!student && student.enrrolment === 'Matriculado' && student.regularity === 'Cursando regular';
        } catch (error) {
            console.error('Error validando el legajo del estudiante:', error);
            return false;
        }
    }

    defaultMessage(args: ValidationArguments) {
        return 'El legajo del estudiante no existe o no cumple con los requisitos de enrolment y regularity.';
    }
}

export function IsStudentFileExists(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsStudentFileExistsConstraint,
        });
    };
}