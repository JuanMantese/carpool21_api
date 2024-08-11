import { TripRequest } from 'src/trip_request/trip_request.entity';
import { UserVehicle } from 'src/users/userVehicles.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';


@Entity('vehicles')
export class Vehicle {
    @PrimaryGeneratedColumn()
    idVehicle: number;

    @Column()
    brand: string;

    @Column()
    model: string;

    @Column()
    color: string;

    @Column()
    year: number;

    @Column()
    patent: string;

    @Column({ unique: true })
    greenCard: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createAt: Date;

    @Column({ type: 'datetime', nullable: true })
    updateAT: Date;

    @Column({ type: 'datetime', nullable: true })
    dateDelete: Date;

    @OneToMany(() => UserVehicle, userVehicle => userVehicle.vehicle)
    userVehicles: UserVehicle[];

    @OneToMany(() => TripRequest, tripRequest => tripRequest.vehicle)
    tripRequests: TripRequest[];
}