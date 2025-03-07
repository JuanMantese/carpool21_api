import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { TripRequest } from 'src/trip_request/trip_request.entity';
import { User } from 'src/users/users.entity';
import { Payments } from 'src/payments/payments.entity';

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

  /** Método de pago */
  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string; // 'CASH' o el id de la tarjeta usada
  
  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  reservationDate: Date;

  @Column({ nullable: true })
  cancellationDate?: Date;

  /** Relación con la tabla Payments */
  @OneToOne(() => Payments, payment => payment.tripReservation, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payments;  // Esta relación puede ser nula si no se ha realizado el pago
}