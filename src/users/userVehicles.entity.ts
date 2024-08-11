import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './users.entity';
import { Vehicle } from 'src/vehicles/vehicles.entity';


@Entity('userbyvehicles')
export class UserVehicle {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.userVehicles)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Vehicle, vehicle => vehicle.userVehicles)
    @JoinColumn({ name: 'vehicleId' })
    vehicle: Vehicle;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createDate: Date;

    @Column({ type: 'datetime', nullable: true })
    deleteDate: Date;

    @Column({ default: true })
    status: boolean;
}