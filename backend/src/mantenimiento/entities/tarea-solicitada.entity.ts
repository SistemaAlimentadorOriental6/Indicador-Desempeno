import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tareas_solicitadas' })
export class TareaSolicitada {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'identificacion' })
    identificacion: string;

    @Column({ name: 'fecha_inicio' })
    fechaInicio: string;

    @Column({ name: 'tiempo_planeacion' })
    tiempoPlaneacion: string;

    @Column({ name: 'estado' })
    estado: string;
}
