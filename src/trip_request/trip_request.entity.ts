import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, OneToMany, OneToOne } from 'typeorm';
import { Point } from 'geojson';
import { Vehicle } from 'src/vehicles/vehicles.entity';
import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { User } from 'src/users/users.entity';
import { TripState } from 'src/trip_states/trip_states.entity';
import { Compensation } from 'src/compensation/compensation.entity';

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

  // Relación con TripState: un viaje tiene un solo estado
  @ManyToOne(() => TripState, (state) => state.tripRequests, { nullable: false })
  @JoinColumn({ name: 'stateId' }) // Columna en la tabla de viaje que hace referencia a TripState
  state: TripState;

  @OneToOne(() => Compensation, { eager: true, nullable: true }) // Carga automáticamente la compensación
  @JoinColumn({ name: 'compensationId' }) 
  compensationId: Compensation;

  @Column({ nullable: true })
  cancellationDate?: Date;
}
