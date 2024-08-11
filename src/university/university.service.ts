import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { University } from './university.entity';
import { Repository } from 'typeorm';
import { CreateUniversityDTO } from './dto/create-university.dto';
import { Point } from 'geojson';

@Injectable()
export class UniversityService {

    constructor(
        @InjectRepository(University)
        private readonly universityRepository: Repository<University>,
    ) {}

    async create(createUniversityDTO: CreateUniversityDTO): Promise<University> {
        const { name, universityNeighborhood, latitude, longitude, universityDescription, status } = createUniversityDTO;

        // Crear la consulta para la posición de la universidad utilizando ST_GeomFromText
        const universityPosition = `ST_GeomFromText('POINT(${longitude} ${latitude})')`;

        // Crear y guardar la universidad utilizando una consulta bruta para la posición espacial
        const university = this.universityRepository.create({
            name,
            universityNeighborhood,
            universityDescription,
            status: status ?? true,
        });

        // Guardar la universidad utilizando una consulta bruta para la posición espacial
        await this.universityRepository.query(
            `INSERT INTO universities (name, universityNeighborhood, universityPosition, universityDescription, status)
             VALUES (?, ?, ${universityPosition}, ?, ?)`,
            [university.name, university.universityNeighborhood, university.universityDescription, university.status]
        );

        return university;
    }

    async delete(idUniversity: number): Promise<void> {
        const result = await this.universityRepository.delete(idUniversity);
        if (result.affected === 0) {
            throw new NotFoundException(`University with ID ${idUniversity} not found`);
        }
    }

    async findAll(): Promise<University[]> {
        const universities = await this.universityRepository.query(`
            SELECT 
                idUniversity, 
                name, 
                universityNeighborhood, 
                ST_AsText(universityPosition) as universityPosition, 
                universityDescription, 
                createDate, 
                deleteDate, 
                status 
            FROM universities
        `);

        return universities.map(university => ({
            ...university,
            universityPosition: this.parsePoint(university.universityPosition)
        }));
    }

    async findOne(idUniversity: number): Promise<University> {
        const university = await this.universityRepository.query(`
            SELECT 
                idUniversity, 
                name, 
                universityNeighborhood, 
                ST_AsText(universityPosition) as universityPosition, 
                universityDescription, 
                createDate, 
                deleteDate, 
                status 
            FROM universities 
            WHERE idUniversity = ?
        `, [idUniversity]);

        if (!university.length) {
            throw new NotFoundException(`University with ID ${idUniversity} not found`);
        }

        return {
            ...university[0],
            universityPosition: this.parsePoint(university[0].universityPosition)
        };
    }

    private parsePoint(point: string): Point {
        const matches = point.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (!matches) {
            throw new Error('Invalid point format');
        }
        return {
            type: 'Point',
            coordinates: [parseFloat(matches[1]), parseFloat(matches[2])]
        };
    }
}
