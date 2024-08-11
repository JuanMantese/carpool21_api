import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './students.entity';
import { IsStudentFileExistsConstraint } from '../common/validators/is-student-file-exists.validator';
import { IsDniMatchStudent } from 'src/common/validators/is-dni-match-student.validator';


@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [IsDniMatchStudent, IsStudentFileExistsConstraint, StudentsService],
  exports: [StudentsService, TypeOrmModule]
})
export class StudentsModule {}
