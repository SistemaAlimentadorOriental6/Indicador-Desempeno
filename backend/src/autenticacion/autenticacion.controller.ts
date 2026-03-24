import { Body, Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto } from './dto/login.dto';

@Controller('autenticacion')
export class AutenticacionController {
    constructor(private readonly autenticacionService: AutenticacionService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: LoginDto) {
        return this.autenticacionService.validarLogin(loginDto);
    }

    @Get('operadores')
    obtenerTodos() {
        return this.autenticacionService.obtenerTodos();
    }
}
