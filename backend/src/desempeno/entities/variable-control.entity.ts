import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('variables_control')
export class VariableControl {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'codigo_empleado', length: 50 })
    codigoEmpleado: string;

    @Column({ name: 'codigo_variable', length: 10 })
    codigoVariable: string;

    @Column({ name: 'valor_programacion', type: 'int', default: 0 })
    valorProgramacion: number;

    @Column({ name: 'valor_ejecucion', type: 'int', default: 0 })
    valorEjecucion: number;

    @Column({ name: 'fecha_inicio_programacion', type: 'date' })
    fechaInicioProgramacion: Date;

    @Column({ name: 'fecha_fin_programacion', type: 'date' })
    fechaFinProgramacion: Date;

    @Column({ name: 'fecha_inicio_ejecucion', type: 'date' })
    fechaInicioEjecucion: Date;

    @Column({ name: 'fecha_fin_ejecucion', type: 'date' })
    fechaFinEjecucion: Date;

    @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaCreacion: Date;
}
