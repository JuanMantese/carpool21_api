import { Vehicle } from 'src/vehicles/vehicles.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class Insurance {
  @PrimaryGeneratedColumn()
  idInsurance: number;

  /** Relación entre Vehiculo y Seguros
   * Un vehículo solo puede tener un seguro
   * { onDelete: 'CASCADE' } → Si un vehículo se elimina, también se elimina su seguro.
   */
  @OneToOne(() => Vehicle, { onDelete: 'CASCADE' }) 
  @JoinColumn({ name: 'idVehicle' }) 
  idVehicle: number;

  // Nombre de la Compañia de Seguros
  @Column()
  insuranceCompany: string;

  // Tipo de Poliza
  @Column()
  insuranceType: string;

  // Fecha de vencimiento del seguro
  @Column({ type: 'date' })
  insuranceExpiration: Date;

  // Número de Poliza
  @Column()
  policyNumber: number;

  @Column({ type: 'bigint' }) 
  cuil_cuit: number;

  @Column({ default: true })
  active: boolean;
}