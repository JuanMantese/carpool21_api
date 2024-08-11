import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { Point } from 'geojson';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';

@Entity('trip_requests')
export class TripRequest {
    @PrimaryGeneratedColumn()
    idTrip: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'idDriver' })
    driver: User;

    @Column()
    pickupNeighborhood: string;

    @Column()
    pickupText: string;

    @Index({ spatial: true })
    @Column({
        type: 'point',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false,
    })
    pickupLocation: Point;

    @Column()
    destinationNeighborhood: string;

    @Column()
    destinationText: string;

    @Index({ spatial: true })
    @Column({
        type: 'point',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false,
    })
    destinationLocation: Point;

    @Column()
    availableSeats: number;

    @Column()
    compensation: number;

    @Column()
    departureTime: string;

    @Column({ type: 'double precision', nullable: true })
    distance?: number;

    @Column({ nullable: true })
    timeDifference?: number;

    @Column({ nullable: true })
    observations?: string;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicleId' })  // Añadir name a la relación
    vehicle: Vehicle;

    @OneToMany(() => TripReservation, reservation => reservation.tripRequest)
    reservations: TripReservation[];
}
