import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { IsGreenCardExists } from "src/common/validators/is-greenCard-exists.validator";

export class CreateVehicleDTO {
    @IsNotEmpty()
    @IsString()
    brand: string;
    @IsNotEmpty()
    @IsString()
    model: string;
    @IsNotEmpty()
    @IsString()
    color: string;
    @IsNotEmpty()
    @IsNumber()
    year: number;
    @IsNotEmpty()
    @IsString()
    patent: string;
    @IsNotEmpty()
    @IsString()
    @IsGreenCardExists({
        message: 'La tarjeta verde del auto no existe o los datos del auto no coinciden con los registrados en la base de datos.'
    })
    greenCard: string;

}
    