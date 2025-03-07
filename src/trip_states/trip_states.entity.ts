import { TripRequest } from 'src/trip_request/trip_request.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('trip_states')
export class TripState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  // Relación inversa: un estado puede estar asociado a muchos viajes
  @OneToMany(() => TripRequest, (tripRequest) => tripRequest.state)
  tripRequests: TripRequest[];
}