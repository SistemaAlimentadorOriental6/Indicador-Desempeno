import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MantenimientoController } from './mantenimiento.controller';
import { MantenimientoService } from './mantenimiento.service';
import { TareaSolicitada } from './entities/tarea-solicitada.entity';
import { ProgramacionEmpleado } from './entities/programacion-empleado.entity';
import { Operador } from '../autenticacion/entities/operador.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([TareaSolicitada], 'mantenimiento'),
        TypeOrmModule.forFeature([ProgramacionEmpleado], 'programacion'),
        TypeOrmModule.forFeature([Operador]),
    ],
    controllers: [MantenimientoController],
    providers: [MantenimientoService],
})
export class MantenimientoModule { }
