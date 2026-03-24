import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('usuarios')
export class Usuario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    nombre: string;

    @Index({ unique: true })
    @Column({ length: 50 })
    codigo: string;

    @Column({ length: 255 })
    clave: string;


    @Column({ type: 'json', nullable: true })
    permisos: any;

    @Index()
    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn()
    fecha_creacion: Date;

    @Column({ type: 'datetime', nullable: true })
    ultimo_acceso: Date;
}
