import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import {ExtractJwt, Strategy} from "passport-jwt"

import { jwtConstants } from './jwt.constants';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
            usernameField: 'email',
            passwordField: 'password'
        })
    }
    async validate(payload: any){
        return { 
            idUser: payload.idUser,  
            name: payload.name, 
            lastName: payload.lastName, 
            roles: payload.roles };

    }
}