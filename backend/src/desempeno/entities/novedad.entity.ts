import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('novedades')
export class Novedad {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'fecha_inicio_novedad', type: 'date' })
    fechaInicioNovedad: Date;

    @Column({ name: 'fecha_fin_novedad', type: 'date' })
    fechaFinNovedad: Date;

    @Column({ name: 'codigo_empleado' })
    codigoEmpleado: string;

    @Column({ name: 'codigo_factor' })
    codigoFactor: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;
}
