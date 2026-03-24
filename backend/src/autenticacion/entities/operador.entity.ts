import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('operadores_sao6')
export class Operador {
    @PrimaryColumn()
    codigo: string;

    @Column()
    nombre: string;

    @Column({ type: 'int' })
    cedula: number;

    @Column({ nullable: true })
    rol: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    zona: string;

    @Column({ nullable: true })
    padrino: string;

    @Column({ nullable: true })
    tarea: string;
}
