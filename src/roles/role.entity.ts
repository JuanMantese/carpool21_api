import { UserRole } from 'src/users/userRole.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';


@Entity('roles')
export class Role {
    @PrimaryColumn()
    idRole: string;

    @Column({ unique: true })
    name: string;

    @Column({ default: true })
    active: boolean;

    @Column()
    route: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createAt: Date;

    @Column({ type: 'datetime', nullable: true })
    updateAT: Date;

    @Column({ type: 'datetime', nullable: true })
    dateDown: Date;

    @OneToMany(() => UserRole, userRole => userRole.role)
    userRoles: UserRole[];
}