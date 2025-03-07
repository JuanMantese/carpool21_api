import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Payments } from "./payments.entity";
import { Repository } from "typeorm";
import { CreatePaymentsDto } from "./dto/register-payments.dto";
import { CardsMock } from "src/cards_mock/cards-mock.entity";
import { User } from "src/users/users.entity";
import { CardsService } from "src/cards/cards.service";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payments)
    private paymentsRepository: Repository<Payments>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CardsMock) 
    private cardsMockRepository: Repository<CardsMock>,

    private readonly cardsService: CardsService,
  ) {}


  async registerPayment(userId: number, createPaymentsDto: CreatePaymentsDto): Promise<Payments> {
    const { paymentMethod, amount, tripId, ...cardDetails } = createPaymentsDto;

    // 1. Validación de usuario
    const user = await this.userRepository.findOne({ where: { idUser: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validando que el paymentMethod tenga un valor aceptado - CASH - OtherCard - ID de 1 a 100.000
    if (!/^([1-9][0-9]{0,2}|1000000|CASH|OtherCard)$/.test(paymentMethod)) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'INVALID_PAYMENT_METHOD',
        message: 'Método de pago no válido. Debe ser CASH, OtherCard o el ID de la tarjeta registrada.',
      });
    }

    if (paymentMethod === 'CASH') {
      // 1. Si el pago es en efectivo, simplemente registramos el pago 
      const newPayment = this.paymentsRepository.create({
        userId,
        tripId,
        amount,
        paymentMethod,
        paymentDate: new Date()
      });

      return await this.paymentsRepository.save(newPayment);

    } else if (paymentMethod === 'OtherCard') {
      // 2. Si el pago es con "OtherCard", verificamos si la tarjeta existe en el Banco y sus datos son correctos
      const existingCard = await this.cardsMockRepository.findOneBy({
        cardNumber: cardDetails.cardNumber,
        ownerName: cardDetails.ownerName.toLowerCase(),
        expirationDate: cardDetails.expirationDate,
        cvv: cardDetails.cvv,
      });

      if (!existingCard) {
        throw new NotFoundException({
          statusCode: 404,
          errorCode: 'CARD_NOT_FOUND',
          message: 'La tarjeta no existe o los datos no coinciden',
        });
      }

      // Crear y guardar la nueva tarjeta si el usuario lo quiere
      let cardId = paymentMethod;
      if (cardDetails.saveNewCard) {
        const createCardsDto = { 
          cardNumber: cardDetails.cardNumber,
          ownerName: cardDetails.ownerName,
          expirationDate: cardDetails.expirationDate,
          cvv: cardDetails.cvv
        };
        const newCard = await this.cardsService.create(userId, createCardsDto);
        cardId = newCard.idCard.toString(); // Asignamos el ID de la nueva tarjeta
      }

      // Realizando el pago
      const newPayment = this.paymentsRepository.create({
        userId,
        tripId,
        amount,
        paymentMethod: cardId,
        paymentDate: new Date()
      });

      return await this.paymentsRepository.save(newPayment);

    } else {
      // 3. Si el pago es con una tarjeta registrada, buscamos la tarjeta en CardsRepository
      const card = await this.cardsService.findCardByUser(userId, parseInt(paymentMethod));

      if (!card) {
        throw new NotFoundException({
          statusCode: 404,
          errorCode: 'CARD_NOT_FOUND',
          message: 'La tarjeta no pertenece a este usuario o no existe',
        });
      }

      // Registrar el pago con la tarjeta existente
      const newPayment = this.paymentsRepository.create({
        userId,
        tripId,
        amount,
        paymentMethod,
        paymentDate: new Date()
      });

      return await this.paymentsRepository.save(newPayment);
    }
  }


  async findAll(): Promise<Payments[]> {
    return this.paymentsRepository.find();
  }


  async findOne(id: number): Promise<Payments> {
    const payment = await this.paymentsRepository.findOne({ where: { idPayment: id } });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }


  /** Retorna todos los pagos realizados por un usuario */
  async findAllByUser(userId: number): Promise<Payments[]> {
    const payments = await this.paymentsRepository.find({
      where: { userId }, // Filtra los pagos por el ID del usuario
      relations: ['tripReservation'], // Datos de la Reserva
    });

    if (!payments || payments.length === 0) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PAYMENTS_NOT_FOUND',
        message: 'No hay pagos registrados para este usuario',
      });
    }

    // Eliminar la propiedad 'tripReservation' si no deseas que se devuelva
    payments.forEach(payment => {
      delete payment.tripReservation; // Eliminar la propiedad 'tripReservation' de cada pago
    });

    return payments;
  }

  /** Retorna un pago específico de un usuario según el ID del pago */
  async findPaymentByUser(userId: number, paymentId: number): Promise<Payments> {
    // 1. Buscar el pago por ID
    const payment = await this.paymentsRepository.findOne({
      where: { idPayment: paymentId },
      relations: ['tripReservation'], // Datos de la Reserva
    });

    if (!payment) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'PAYMENT_NOT_FOUND',
        message: 'El pago no está registrado!!!',
      });
    }

    // 2. Verificar si el pago pertenece al usuario que lo solicita
    if (payment.userId !== parseInt(userId.toString())) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'PAYMENT_NOT_BELONG_TO_USER',
        message: 'El pago no pertenece al usuario',
      });
    }

    // Eliminar la propiedad 'tripReservation' si no deseas que se devuelva
    delete payment.tripReservation;

    return payment;
  }


  async remove(id: number): Promise<void> {
    await this.paymentsRepository.delete(id);
  }

}