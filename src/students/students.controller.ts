import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { StudentsService } from './students.service';
import { CreateStudentDTO } from './dto/create-student.dto';
import { Student } from './students.entity';


@Controller('students')
export class StudentsController {
    constructor(private studentsService : StudentsService) {}

    @Post('create')//http://localhost:3000/students/create -> POST
    create(@Body() studentDTO: CreateStudentDTO) {
        return this.studentsService.create(studentDTO);
    }

    @Get('findStudentVerify/:studentFile/verify') // http://localhost:3000/students/findStudentVerify/ABC123/verify
    async findStudentVerify(@Param('studentFile') studentFile: string): Promise<any> {
        const student = await this.studentsService.findStudentVerify(studentFile);
        

        if (!student) {
            return { message: 'Estudiante no encontrado' };
        }

        if (student.enrrolment === 'Matriculado' && student.regularity === 'Cursando regular') {
            return student;
        } else {
            return { message: 'El estudiante no cumple con los requisitos de enrrolment y regularity' };
        }
    }

    @Get('findStudent/:studentFile') // http://localhost:3000/students/findStudent/ABC123
    async findStudent(@Param('studentFile') studentFile: string): Promise<Student | null> {
        return this.studentsService.findStudent(studentFile);
    }

    @Get('verifyDniForStudentFile/:studentFile/verify-dni/:dni')    // http://localhost:3000/students/verifyDniForStudentFile/ABC123/verify-dni/12345678
    async verifyDniForStudentFile(@Param('studentFile') studentFile: string, @Param('dni') dni: number): Promise<any> {
        const student = await this.studentsService.findStudent(studentFile);

        if (!student) {
            return { message: 'Estudiante no encontrado' };
        }

        const dniStudent = student.dniStudent.toString();
        const isDniMatching = dniStudent === dni.toString();

        if (isDniMatching) {
            return { isDniMatching, dni, message: 'El DNI coincide con el del estudiante proporcionado.' , dniStudent};
        } else {
            return { isDniMatching, dni, message: 'El DNI no coincide con el del estudiante proporcionado.' , dniStudent};
        }
    }
    
    @Delete('delete/:id') // http://localhost:3000/students/delete/1
    delete(@Body() id: number) {
        return this.studentsService.delete(id);
    }
}
