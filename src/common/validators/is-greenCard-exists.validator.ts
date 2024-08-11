import { Injectable } from "@nestjs/common";
import { ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";
import { CarsService } from "src/cars/cars.service";
import { CreateVehicleDTO } from "src/vehicles/dto/create-vehicle.dto";

@ValidatorConstraint({ async: true })
@Injectable()
export class IsGreenCardExistsConstraint implements ValidatorConstraintInterface {
    constructor(private carsService: CarsService) {}

    async validate(greenCard: string, args: ValidationArguments) {
        const dto = args.object as CreateVehicleDTO;

        if (!dto.patent || !dto.brand || !dto.model || !dto.year) {
            return false;
        }

        try {
            const car = await this.carsService.findCar(greenCard);
            return !!car && car.patent === dto.patent && car.brand === dto.brand && car.model === dto.model && car.year === dto.year;
        } catch (error) {
            console.error('Error validando la tarjeta verde del auto:', error);
            return false;
        }
    }

    defaultMessage(args: ValidationArguments) {
        return 'La tarjeta verde del auto no existe o los datos del auto no coinciden con los registrados en la base de datos.';
    }
}

export function IsGreenCardExists(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsGreenCardExistsConstraint,
        });
    };
}