import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cards } from './cards.entity';
import { CreateCardsDto } from './dto/create-cards.dto';
import { CardsMock } from 'src/cards_mock/cards-mock.entity';
import { User } from 'src/users/users.entity';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Cards) 
    private cardsRepository: Repository<Cards>,
    @InjectRepository(CardsMock) 
    private cardsMockRepository: Repository<CardsMock>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: number, createCardsDto: CreateCardsDto): Promise<Cards> {
    // 1. Buscar el usuario
    const user = await this.userRepository.findOne({ where: { idUser: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Validar si ya existe una tarjeta registrada para ese usuario con el mismo número
    const existingCardForUser = await this.cardsRepository.findOne({
      where: { user: { idUser: userId }, cardNumber: createCardsDto.cardNumber },
    });
    if (existingCardForUser) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CARD_ALREADY_REGISTERED',
        message: 'El usuario ya tiene una tarjeta registrada con este número',
      });
    }

    // 3. Validar si la tarjeta existe en el Banco y sus datos son correctos
    const existingCard = await this.cardsMockRepository.findOneBy({
      cardNumber: createCardsDto.cardNumber,
      ownerName: createCardsDto.ownerName.toLowerCase(),
      expirationDate: createCardsDto.expirationDate,
      cvv: createCardsDto.cvv,
    });
    if (!existingCard) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'CARD_NOT_FOUND',
        message: 'La tarjeta no existe o los datos no coinciden',
      });
    }

    // 4. Crear la nueva tarjeta asociada al usuario
    const newCard = this.cardsRepository.create({ 
      ...createCardsDto, 
      user,
      cardBrand: existingCard.cardBrand 
    });

    // 5. Guardar la tarjeta en la base de datos
    const card = await this.cardsRepository.save(newCard);
    delete card.user;  // Esto eliminará la propiedad 'user' del objeto a devolver
    
    return card
  }

  /** Retorna todas las Tarjetas registradas en la BD */
  async findAll(): Promise<Cards[]> {
    return this.cardsRepository.find();
  }
  

  /** Retorna una tarjeta segun su ID */
  async findOne(cardId: number): Promise<Cards> {
    // 1. Buscar la tarjeta por ID
    const card = await this.cardsRepository.findOne({ where: { idCard: cardId } });

    // 2. Si no se encuentra la tarjeta, lanzamos un error
    if (!card) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CARD_NOT_FOUND',
        message: 'La tarjeta no está registrada o no se encuentra'
      });
    }

    delete card.user;  // Esto eliminará la propiedad 'user' del objeto a devolver

    // 3. Si se encuentra la tarjeta, la retornamos
    return card;
  }

  /** Retorna todas las Tarjetas registradas en la BD */
  async findAllByUser(userId: number): Promise<Cards[]> {
    const cards = await this.cardsRepository.find({
      where: { user: { idUser: userId } },
      relations: ['user'], // Si necesitas asegurarte de que la relación con el usuario también se cargue
    });
  
    // Si no se encuentran tarjetas para este usuario, devolver un array vacío
    if (!cards || cards.length === 0) {
      return [];
    }

    // Eliminar la propiedad 'user' de cada tarjeta en el array
    cards.forEach(card => {
      delete card.user; // Eliminar la propiedad 'user' de cada tarjeta
    });

    return cards;
  }


  /** Retorna la tarjeta de un Usuario especifico según el ID del User y el ID de la Card */
  async findCardByUser(userId: number, cardId: number): Promise<Cards> {
    // 1. Buscar la tarjeta por ID
    const card = await this.cardsRepository.findOne({ 
      where: { idCard: cardId }, 
      relations: ['user'] // Aseguramos que también se cargue la relación con 'user' para validar la pertenencia
    });

    if (!card) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CARD_NOT_FOUND',
        message: 'La tarjeta no está registrada!!!'
      });
    }

    // 2. Verificar si la tarjeta pertenece al usuario que la solicita
    if (card.user.idUser !== parseInt(userId.toString())) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CARD_NOT_BELONG_TO_USER',
        message: 'La tarjeta no pertenece al usuario'
      });
    }

    delete card.user;  // Esto eliminará la propiedad 'user' del objeto a devolver

    return card; 
  }


  async remove(id: number): Promise<void> {
    await this.cardsRepository.delete(id);
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