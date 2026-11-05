import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaDatosController } from './carga-datos.controller';
import { CargaDatosService } from './carga-datos.service';
import { VariableControlPrueba } from './entities/variable-control-prueba.entity';
import { Operador } from '../autenticacion/entities/operador.entity';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([VariableControlPrueba, Operador]),
        AutenticacionModule
    ],
    controllers: [CargaDatosController],
    providers: [CargaDatosService],
})
export class CargaDatosModule { }
