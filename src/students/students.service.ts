import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './students.entity';
import { Repository } from 'typeorm';
import { CreateStudentDTO } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
    constructor(
        @InjectRepository(Student) 
        private studentsRepository: Repository<Student>,
    ) {}

    create(studentDTO: CreateStudentDTO) {
        const newStudent = this.studentsRepository.create(studentDTO);
        return this.studentsRepository.save(newStudent);
    }

    delete(id: number) {
        return this.studentsRepository.delete(id);
    }
    
    async findStudent(studentFile: string): Promise<Student | null> {
        return await this.studentsRepository.findOneBy({ studentFile });
    }

    async findStudentVerify(studentFile: string) {
        return await this.studentsRepository.findOneBy({ studentFile });
    }

    async verifyDniForStudentFile(studentFile: string, dni: number): Promise<boolean> {
        const student = await this.studentsRepository.findOneBy({ studentFile });
        return student ? student.dniStudent === dni : false;
    }

}
