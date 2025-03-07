import { TripReservation } from 'src/trip_reservation/trip_reservation.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, CreateDateColumn } from 'typeorm';

@Entity()
export class Payments {
  @PrimaryGeneratedColumn()
  idPayment: number;

  /** ID Trip al cual se realizo el pago */
  @Column({ type: 'int', nullable: false })
  tripId: number;

  /** ID Passenger que realizo el pago */
  @Column({ type: 'int', nullable: false })
  userId: number;

  /** Método de pago utilizado */
  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string; // 'CASH' o el id de la tarjeta usada
  
  /** Representa el monto de la compensación en formato decimal. 
   * 🔹 **Base de datos:** Se almacena como un `DECIMAL(10,2)`, lo que significa que tiene
   * hasta 10 dígitos en total, con 2 decimales de precisión.
   * 🔹 **Transformación:**  
   * - **Al guardar (`to`)**: Se almacena directamente como un `number` en la base de datos.  
   * - **Al recuperar (`from`)**: Se convierte de `string` a `number`, ya que TypeORM (el motor de bases de datos utilizado)
   *  devuelven los valores DECIMAL como cadenas para evitar pérdida de precisión
   */
  @Column('decimal', { precision: 10, scale: 2, transformer: { 
    to: (value: number) => value, 
    from: (value: string) => Number(value) 
  }})
  amount: number;

  @CreateDateColumn({ type: 'timestamp' })
  paymentDate: Date;

  /** Relación con la entidad TripReservation */
  @OneToOne(() => TripReservation, tripReservation => tripReservation.payment)
  tripReservation: TripReservation;  // Relación inversa con la reserva de viaje
}