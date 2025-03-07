import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardsMock } from './cards-mock.entity';
import { CreateCardsMockDto } from './dto/create-cards-mock.dto';

@Injectable()
export class CardsMockService {
  constructor(
    @InjectRepository(CardsMock)
    private readonly cardsMockRepository: Repository<CardsMock>,
  ) {}

  async create(createCardsMockDto: CreateCardsMockDto): Promise<CardsMock> {
    const newCard = this.cardsMockRepository.create(createCardsMockDto);
    
    // Asignar la marca de tarjeta según el número
    newCard.cardBrand = this.detectCardBrand(newCard.cardNumber);

    return this.cardsMockRepository.save(newCard);
  }

  async findAll(): Promise<CardsMock[]> {
    return this.cardsMockRepository.find();
  }

  async findOne(id: number): Promise<CardsMock> {
    return this.cardsMockRepository.findOne({ where: { idCard: id } });
  }

  async remove(id: number): Promise<void> {
    await this.cardsMockRepository.delete(id);
  }

  
  /**
   * Función para detectar la entidad bancaria de una tarjeta de crédito basándose en los primeros dígitos de su número.
   *
   * Las reglas de detección se basan en los estándares internacionales de numeración de tarjetas:
   * - **VISA**: Comienza con "4" y tiene 13 o 16 dígitos.
   * - **MASTERCARD**: Comienza con un número entre "51" y "55" y tiene 16 dígitos.
   * - **AMEX**: Comienza con "34" o "37" y tiene 15 dígitos.
   * - Si no coincide con ninguna de estas reglas, se retorna `"UNKNOWN"`.
   *
   * @param {string} cardNumber - Número de la tarjeta de crédito a evaluar.
   * @returns {string} - La marca de la tarjeta (`"VISA"`, `"MASTERCARD"`, `"AMEX"`, o `"UNKNOWN"`).
   *
   * @example
   * detectCardBrand("4111111111111111"); // "VISA"
   * detectCardBrand("5500000000000004"); // "MASTERCARD"
   * detectCardBrand("340000000000009");  // "AMEX"
   * detectCardBrand("1234567890123456"); // "UNKNOWN"
   */
  private detectCardBrand(cardNumber: string): string {
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cardNumber)) return 'VISA';
    if (/^5[1-5][0-9]{14}$/.test(cardNumber)) return 'MASTERCARD';
    if (/^3[47][0-9]{13}$/.test(cardNumber)) return 'AMEX';
    return 'UNKNOWN';
  }
}