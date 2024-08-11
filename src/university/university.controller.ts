import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UniversityService } from './university.service';
import { CreateUniversityDTO } from './dto/create-university.dto';
import { University } from './university.entity';

@Controller('university')
export class UniversityController {

    constructor(private readonly universityService: UniversityService) {}

    @Post('create') // POST localhost:3000/university/create
    async create(@Body() createUniversityDTO: CreateUniversityDTO): Promise<University> {
        return this.universityService.create(createUniversityDTO);
    }

    @Delete('delete/:idUniversity') // DELETE localhost:3000/university/delete/:idUniversity
    async delete(@Param('idUniversity') idUniversity: number): Promise<void> {
        return this.universityService.delete(idUniversity);
    }

    @Get('findAll') // GET localhost:3000/university/findAll
    async findAll(): Promise<University[]> {
        return this.universityService.findAll();
    }

    @Get('findOne/:idUniversity') // GET localhost:3000/university/findOne/:idUniversity
    async findOne(@Param('idUniversity') idUniversity: number): Promise<University> {
        return this.universityService.findOne(idUniversity);
    }
}
