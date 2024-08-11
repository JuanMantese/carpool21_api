import { PartialType } from '@nestjs/mapped-types';
import { CreateCompensationDto } from './create-compensatio.dto';


export class UpdateCompensationDto extends PartialType(CreateCompensationDto) {}