import { Body, Controller, Post } from '@nestjs/common';
import { register } from 'module';
import { AuthService } from './auth.service';
import { RegisterAuthDTO } from './dto/register-auth.dto';
import { LoginAuthDTO } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {

        constructor(private authService: AuthService) {}

            @Post('register') //http://localhost:3000/auth/register -> POST
            register(@Body() userDTO: RegisterAuthDTO) {
                return this.authService.register(userDTO);
            }

            @Post('login') //http://localhost:3000/login -> POST
            login(@Body() loginDTO: LoginAuthDTO) {
                return this.authService.login(loginDTO);
            }

            
}
