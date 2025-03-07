
import { ServiceExceptionHandler } from '../../common/exceptions/internalServerError.exception';
import { DataSource, Repository } from 'typeorm';

export abstract class GeneralRepository<T> {
  protected readonly serviceExceptionHandler = new ServiceExceptionHandler();

  constructor(
    private readonly dataSource: DataSource  // Inyección de DataSource desde TypeORM
  ) {}

  // Método para obtener el repositorio de una entidad
  async repository(): Promise<Repository<T>> {
    return this.dataSource.getRepository(this.getEntity()); // Devuelve el repositorio correspondiente
  }

  // Método abstracto para obtener la clase de la entidad correspondiente
  protected abstract getEntity(): new () => T;
}
