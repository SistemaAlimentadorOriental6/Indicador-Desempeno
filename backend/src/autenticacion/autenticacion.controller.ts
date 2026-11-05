import { Body, Controller, Post, Get, Put, Param, HttpCode, HttpStatus } from '@nestjs/common';
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

    @Put('operadores/:codigo')
    actualizarOperador(
        @Param('codigo') codigo: string,
        @Body() body: { zona: string; padrino: string }
    ) {
        return this.autenticacionService.actualizarOperador(codigo, body);
    }
}
