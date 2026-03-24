import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutenticacionController } from './autenticacion.controller';
import { AutenticacionService } from './autenticacion.service';
import { Operador } from './entities/operador.entity';
import { ApiEmpleadosService } from './services/api-empleados.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Operador, Usuario])],
    controllers: [AutenticacionController],
    providers: [AutenticacionService, ApiEmpleadosService],
    exports: [AutenticacionService, ApiEmpleadosService],
})
export class AutenticacionModule { }
