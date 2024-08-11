import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DriversPositionService } from './driver_position.service';
import { CreateDriverPositionDto } from './dto/create-driver-position.dto';

@Controller('drivers-position')
export class DriversPositionController {

    constructor(
        private driversPositionService: DriversPositionService
    ) {}

    @Post()
    create(@Body() driversPosition: CreateDriverPositionDto) {
        return this.driversPositionService.create(driversPosition)
    }   

    @Get(':idDriver')
    getDriverPosition(@Param('idDriver') idDriver: number) {
        return this.driversPositionService.getDriverPosition(idDriver);        
    }

    @Get(':clientLat/:clientLng')
    getNearbyDrivers(@Param('clientLat') clientLat: number, @Param('clientLng') clientLng: number) {
        return this.driversPositionService.getNearbyDrivers(clientLat, clientLng);        
    }

    @Delete(':idDriver')
    delete(@Param('idDriver', ParseIntPipe) idDriver: number ) {
        return this.driversPositionService.delete(idDriver);
    }

}
