

import { Point } from "geojson";
import { User } from "src/users/users.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity({ name: 'drivers_position' })
export class DriversPosition {

    @PrimaryColumn()
    idDriver:  number;

    @Index({ spatial: true })
    @Column({
        type: 'point',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false
    })
    position: Point

    @ManyToOne(() => User, (user) => user.idUser)
    @JoinColumn({ name: 'idDriver' })
    user: User

}