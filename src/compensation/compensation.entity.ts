import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Compensation {
  @PrimaryGeneratedColumn()
  idCompensation: number;

  // Relación solo por el ID
  @Column({ type: 'int', nullable: false })
  idTrip: number;

  /** Representa el monto de la compensación en formato decimal. 
   * 🔹 **Base de datos:** Se almacena como un `DECIMAL(10,2)`, lo que significa que tiene
   * hasta 10 dígitos en total, con 2 decimales de precisión.
   * 🔹 **Transformación:**  
   * - **Al guardar (`to`)**: Se almacena directamente como un `number` en la base de datos.  
   * - **Al recuperar (`from`)**: Se convierte de `string` a `number`, ya que TypeORM (el motor de bases de datos utilizado)
   *  devuelven los valores DECIMAL como cadenas para evitar pérdida de precisión
   */
  @Column('decimal', { precision: 10, scale: 2, transformer: { 
    to: (value: number) => value, 
    from: (value: string) => Number(value) 
  }})
  amount: number;

  @Column('float')
  ratePerKm: number;

  @Column('float')
  priceBusTicket: number = 1200;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, default: null })
  deletedAt: Date;
}