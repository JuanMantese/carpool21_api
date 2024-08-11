import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('students')
export class Student {
    @PrimaryGeneratedColumn()
    idStudent: number;
    @Column()
    name: string;
    @Column()
    lastName: string;
    @Column({unique: true})
    studentFile: string;
    @Column({unique: true})
    dniStudent: number;
    @Column()
    enrrolment: string;
    @Column()
    regularity: string;
}