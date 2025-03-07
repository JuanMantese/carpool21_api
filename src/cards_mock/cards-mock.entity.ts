import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, Check } from 'typeorm';

@Entity()
@Check(`LENGTH(cardNumber) = 15 OR LENGTH(cardNumber) = 16`) // Restricción para aceptar solo 15 o 16 caracteres
export class CardsMock {
  @PrimaryGeneratedColumn()
  idCard: number;

  @Column({ type: 'varchar', length: 16 })
  cardNumber: string;

  @Column()
  ownerName: string;

  @Column({ type: 'varchar', length: 7 }) // Formato YYYY/MM
  expirationDate: string;

  @Column({ type: 'int', width: 5 }) // Hasta 5 dígitos
  cvv: number;

  @Column({ type: 'varchar', length: 20 }) // VISA, AMEX, MASTERCARD
  cardBrand: string;

  @Column({ default: true })
  active: boolean;

  /** Se ejecuta siempre antes de cada inserción */
  @BeforeInsert()
  normalizeOwnerName() {
    this.ownerName = this.ownerName.toLowerCase();
  }
}