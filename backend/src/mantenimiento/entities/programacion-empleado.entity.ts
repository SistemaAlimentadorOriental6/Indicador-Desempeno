import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'programacion_empleados' })
export class ProgramacionEmpleado {
    @PrimaryColumn({ name: 'CEDULA' })
    cedula: number;

    @PrimaryColumn({ name: 'Fecha_programacion' })
    fechaProgramacion: Date;

    @Column({ name: 'Horario_programacion' })
    horarioProgramacion: string;

    @Column({ name: 'Area' })
    area: string;

    @Column({ name: 'Tiempo a descontar [h]', type: 'double' })
    tiempoADescontar: number;
}
