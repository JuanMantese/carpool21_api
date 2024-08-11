import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriversPosition } from './driver_position.entity';
import { Repository } from 'typeorm';
import { CreateDriverPositionDto } from './dto/create-driver-position.dto';

@Injectable()
export class DriversPositionService {

    constructor(
        @InjectRepository(DriversPosition) private driversPositionRepository: Repository<DriversPosition>
    ) {}

    async create(driverPosition: CreateDriverPositionDto) {
        try {
            const data = await this.driversPositionRepository.query(`
                SELECT 
                    *
                FROM
                    drivers_position
                WHERE
                    idDriver = ${driverPosition.idDriver}
            `);            
            if (data.length <= 0) {
                const newPosition = await this.driversPositionRepository.query(`
                    INSERT INTO 
                        drivers_position(idDriver, position)
                    VALUES(
                        ${driverPosition.idDriver},
                        ST_GeomFromText('POINT(${driverPosition.lat} ${driverPosition.lng})', 4326)
                    )
                `);
            }
            else {
                const newPosition = await this.driversPositionRepository.query(`
                    UPDATE
                        drivers_position
                    SET
                        position = ST_GeomFromText('POINT(${driverPosition.lat} ${driverPosition.lng})', 4326)
                    WHERE
                        idDriver = ${driverPosition.idDriver}
                `);
            }
            return true;    
        } catch (error) {
            console.log('Error creando la posicion del conductor', error);
            return false;    
        }
    }

    async getDriverPosition(idDriver: number) {
        const driverPosition = await this.driversPositionRepository.query(`
        SELECT
            *
        FROM
            drivers_position
        WHERE
            idDriver = ${idDriver}
        `);
        return {
            'idDriver': driverPosition[0].idDriver,
            'lat': driverPosition[0].position.y,
            'lng': driverPosition[0].position.x,
        };
    }

    async getNearbyDrivers(clientLat: number, clientLng: number) {
        const driversPosition = await this.driversPositionRepository.query(`
            SELECT
                idDriver,
                position,
                ST_Distance_Sphere(position, ST_GeomFromText('POINT(${clientLat} ${clientLng})', 4326)) AS distance
            FROM
                drivers_position
            HAVING distance <= 5000
        `);
        return driversPosition;
    }

    delete(idDriver: number) {
        return this.driversPositionRepository.delete(idDriver);
    }

}

