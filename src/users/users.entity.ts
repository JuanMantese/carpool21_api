import { BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Ratings } from 'src/ratings/ratings.entity';
import { UserRole } from './userRole.entity';
import { UserVehicle } from './userVehicles.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    idUser: number;

    @Column()
    name: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    studentFile: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    password: string;

    @Column({ type: 'bigint' })
    phone: number;

    @Column({ unique: true })
    dni: number;

    @Column()
    address: string;

    @Column({ type: 'bigint' })
    contactPhone: number;

    @Column()
    contactName: string;

    @Column()
    contactLastName: string;

    @Column({ default: true })
    stateValidation: boolean;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createAt: Date;

    @Column({ type: 'datetime', nullable: true })
    updateAT: Date;

    @Column({ type: 'datetime', nullable: true })
    dateDown: Date;

    @Column({ type: 'datetime', nullable: true })
    dateDelete: Date;

    @Column({ default: true })
    active: boolean;

    @Column({ nullable: true })
    photoUser: string;

    @Column({ nullable: true })
    notificationToken: string;

    @OneToMany(() => UserRole, userRole => userRole.user)
    userRoles: UserRole[];

    @OneToMany(() => UserVehicle, userVehicle => userVehicle.user)
    userVehicles: UserVehicle[];

    @OneToMany(() => Ratings, ratings => ratings.user)
    ratings: Ratings[];

    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, Number(process.env.SALT));
    }
}