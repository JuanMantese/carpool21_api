import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('cars')
export class Car {
    @PrimaryGeneratedColumn()
    idCar: number;
    @Column()
    brand: string;
    @Column()
    model: string;
    @Column()
    year: number;
    @Column()
    patent: string;
    @Column({unique: true})
    greenCard: string;
    @Column({unique: true})
    dniOwner: number;
    @Column()
    color: string;

}