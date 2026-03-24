import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesempenoController } from './desempeno.controller';
import { DesempenoService } from './desempeno.service';
import { VariableControl } from './entities/variable-control.entity';
import { Novedad } from './entities/novedad.entity';
import { ApiEmpleadosService } from '../autenticacion/services/api-empleados.service';

@Module({
    imports: [TypeOrmModule.forFeature([VariableControl, Novedad])],
    controllers: [DesempenoController],
    providers: [DesempenoService, ApiEmpleadosService],
})
export class DesempenoModule { }
