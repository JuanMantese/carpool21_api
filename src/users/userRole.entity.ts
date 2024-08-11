import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './users.entity';
import { Role } from 'src/roles/role.entity';


@Entity('userbyroles')
export class UserRole {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.userRoles)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Role, role => role.userRoles)
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createDate: Date;

    @Column({ type: 'datetime', nullable: true })
    deleteDate: Date;

    @Column({ default: true })
    status: boolean;

    @Column({ default: true })
    isActive: boolean;
}