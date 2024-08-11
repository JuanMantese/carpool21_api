import { User } from "src/users/users.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'ratings'})
export class Ratings {
    @PrimaryGeneratedColumn()
    idRating: number;

    @Column({name: 'idUser'})
    idUser: number;

    @Column()
    rating: number;

    @Column()
    comment: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    createAt: Date;

    @ManyToOne(() => User, user => user.ratings)
    @JoinColumn({name: 'idUser'})
    user: User;

}