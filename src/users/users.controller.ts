import { Body, Controller, Get, Put, Post, UseGuards, Param, ParseIntPipe, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Req, Patch } from '@nestjs/common';
import { CreateUserDTO } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateUserDTO } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { GetUser } from 'src/auth/jwt/get-user.decorator';
import { User } from './users.entity';
import { ChangeUserRoleDTO, UserRoleType } from './dto/change-user-rol.dto';


@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}
    
    @Post() //http://{ipAdress}:3000/users -> POST
    create(@Body() userDTO: CreateUserDTO) {
        return this.userService.create(userDTO);
    }

    @HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard,JwtRolesGuard)
    @Get() //http://{ipAdress}:3000/users -> GET
    findAll() {
        return this.userService.findAll();
    }

     // Método PUT para actualizar un usuario sin imagen
     @HasRoles(JwtRole.PASSENGER, JwtRole.DRIVER)
     @UseGuards(JwtAuthGuard, JwtRolesGuard)
     @Put('update') //http://localhost:3000/users/update -> PUT
     async update(@GetUser() user: User, @Body() updateUserDTO: UpdateUserDTO) {
         return this.userService.update(user.idUser, updateUserDTO);
     }

     @HasRoles(JwtRole.PASSENGER, JwtRole.DRIVER)
     @UseGuards(JwtAuthGuard, JwtRolesGuard)
     @Post('updateWithImage') //http://localhost:3000/users/updateWithImage -> POST
     @UseInterceptors(FileInterceptor('image'))
     async updateWithImage(
         @GetUser() user: User,
         @UploadedFile(
             new ParseFilePipe({
                 validators: [
                     new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10 MB
                     new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                 ],
             }),
         ) image: Express.Multer.File,
         @Body() updateUserDTO: UpdateUserDTO
     ) {
         return this.userService.updateWithImage(user.idUser, updateUserDTO, image);
     }

     @UseGuards(JwtAuthGuard)
    @Get('details')
    async getUserDetails(@GetUser() user: User): Promise<any> {
        return this.userService.getUserDetails(user.idUser);
    }


    @UseGuards(JwtAuthGuard)
    @Patch('change-role')
    async changeUserRole(
        @GetUser() user: User,
        @Body('idRole') idRole: UserRoleType
    ): Promise<any> {
        return this.userService.changeUserRole(user.idUser, idRole);
    }
}



