import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('operadores')
export class Operador {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    codigo: string;

    @Column({ type: 'varchar', nullable: true })
    zona: string | null;

    @Column({ type: 'varchar', nullable: true })
    padrino: string | null;
}
