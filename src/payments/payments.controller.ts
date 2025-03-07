import { Controller, Post, Get, Param, Body, Delete } from '@nestjs/common';
import { CreatePaymentsDto } from './dto/register-payments.dto';
import { PaymentsService } from './payments.service';


@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Creación de un Seguro
   * POST http://localhost:3000/payments/1
   * @param createPaymentsDto
   * @returns 
   */
  @Post(':userId')
  registerPayment(
    @Param('userId') userId: number,
    @Body() createPaymentsDto: CreatePaymentsDto
  ) {
    return this.paymentsService.registerPayment(userId, createPaymentsDto);
  }

  /** Obtener todos los pagos realizados en la App - ADMIN
   * GET http://localhost:3000/payments 
   */
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  /** Obtener un pago por su ID
   * GET http://localhost:3000/payments/1 
   * @param paymentId ID del Pago
   */
  @Get(':paymentId')
  findOne(@Param('paymentId') paymentId: number) {
    return this.paymentsService.findOne(paymentId);
  }

  /**
   * Obtiene todos los pagos realizados por un usuario específico.
   * 
   * @route GET http://localhost:3000/payments/findAllByUser/:userId
   * @param {number} userId - ID del usuario cuyos pagos se desean obtener.
   * @returns {Promise<Payments[]>} Lista de pagos realizados por el usuario.
   * @throws {NotFoundException} Si no hay pagos registrados para el usuario.
   */
  @Get('findAllByUser/:userId')
  findAllByUser(@Param('userId') userId: number) {
    return this.paymentsService.findAllByUser(userId);
  }

  /**
   * Obtiene un pago específico realizado por un usuario.
   * 
   * @route GET http://localhost:3000/payments/:userId/:paymentId
   * @param {number} userId - ID del usuario que realizó el pago.
   * @param {number} paymentId - ID del pago a consultar.
   * @returns {Promise<Payments>} El pago correspondiente al usuario y al ID especificado.
   * @throws {NotFoundException} Si el pago no existe.
   * @throws {ConflictException} Si el pago no pertenece al usuario especificado.
   */
  @Get(':userId/:paymentId')
  findPaymentByUser(
    @Param('userId') userId: number,
    @Param('paymentId') paymentId: number
  ) {
    return this.paymentsService.findPaymentByUser(userId, paymentId);
  }

  /** Borrado Logico de un seguro por ID
   * DELETE http://localhost:3000/payments/1
   * @param id 
   * @returns 
   */
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.paymentsService.remove(id);
  }
}