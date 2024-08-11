import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TripRequest } from 'src/trip_request/trip_request.entity';
import { User } from 'src/users/users.entity';

@Entity('trip_reservations')
export class TripReservation {
    @PrimaryGeneratedColumn()
    idReservation: number;

    @ManyToOne(() => TripRequest, tripRequest => tripRequest.reservations)
    @JoinColumn({ name: 'tripRequestId' })
    tripRequest: TripRequest;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'idUser' })
    passenger: User;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    reservationDate: Date;

    @Column({ default: false })
    isPaid: boolean;

    @Column({ nullable: true })
    cancellationDate?: Date;
}