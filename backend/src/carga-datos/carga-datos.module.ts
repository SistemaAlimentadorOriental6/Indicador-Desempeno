import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaDatosController } from './carga-datos.controller';
import { CargaDatosService } from './carga-datos.service';
import { VariableControlPrueba } from './entities/variable-control-prueba.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VariableControlPrueba])],
    controllers: [CargaDatosController],
    providers: [CargaDatosService],
})
export class CargaDatosModule { }
