import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Point } from 'geojson';

@Entity('universities')
export class University {
    @PrimaryGeneratedColumn()
    idUniversity: number;

    @Column()
    name: string;

    @Column()
    universityNeighborhood: string;

    @Index({ spatial: true })
    @Column({
        type: 'point',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: false,
    })
    universityPosition: Point;

    @Column({ nullable: true })
    universityDescription: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createDate: Date;

    @Column({ type: 'datetime', nullable: true })
    deleteDate: Date;

    @Column({ default: true })
    status: boolean;
}
