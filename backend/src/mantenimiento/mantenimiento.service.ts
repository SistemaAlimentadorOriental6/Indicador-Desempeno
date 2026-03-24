import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TareaSolicitada } from './entities/tarea-solicitada.entity';
import { ProgramacionEmpleado } from './entities/programacion-empleado.entity';

export interface ReporteMantenimiento {
    cedula: string;
    nombre: string;
    rangoLabel: string;
    rol: string;
    imagen: string;
    horasRealizadas: string;
    horasProgramadas: string;
    cumplimiento: string;
    rango: string;
    detalleRealizado: any[];
    detalleProgramado: any[];
    // Detalles extra del operador para el modal
    codigo?: string;
    zona?: string;
    padrino?: string;
    ingreso?: string;
    edad?: string;
    antiguedad?: string;
}
import { Operador } from '../autenticacion/entities/operador.entity';

@Injectable()
export class MantenimientoService {
    constructor(
        @InjectRepository(TareaSolicitada, 'mantenimiento')
        private tareasRepo: Repository<TareaSolicitada>,
        @InjectRepository(ProgramacionEmpleado, 'programacion')
        private programacionRepo: Repository<ProgramacionEmpleado>,
        @InjectRepository(Operador)
        private operadorRepo: Repository<Operador>,
        @InjectDataSource('sqlserver')
        private readonly sqlServerDataSource: DataSource,
    ) { }

    async obtenerDesempenoMantenimiento(fechaInicio: string, fechaFin: string) {
        // 1. Obtener Horas Realizadas (Tareas Solicitadas)
        const tareas = await this.tareasRepo.createQueryBuilder('tarea')
            .where('tarea.fechaInicio >= :inicio', { inicio: fechaInicio })
            .andWhere('tarea.fechaInicio <= :fin', { fin: fechaFin + ' 23:59:59' })
            .getMany();

        // Agrupar horas realizadas por Cédula -> Fecha -> Horas
        const realizadasPorUsuario = {};

        tareas.forEach(tarea => {
            const cedula = tarea.identificacion;
            const horas = parseFloat(tarea.tiempoPlaneacion || '0');

            if (!realizadasPorUsuario[cedula]) {
                realizadasPorUsuario[cedula] = {
                    totalRealizadas: 0,
                    detalle: []
                };
            }
            realizadasPorUsuario[cedula].totalRealizadas += horas;
            realizadasPorUsuario[cedula].detalle.push({
                fecha: tarea.fechaInicio,
                horas: horas
            });
        });

        // 2. Obtener Horas Programadas (Query robusta para evitar sorpresas con Between)
        const programaciones = await this.programacionRepo.createQueryBuilder('prog')
            .where('prog.fechaProgramacion >= :inicio', { inicio: fechaInicio })
            .andWhere('prog.fechaProgramacion <= :fin', { fin: fechaFin })
            .andWhere('prog.area = :area', { area: 'Mantenimiento' })
            .getMany();

        const programadasPorUsuario = {};

        programaciones.forEach(prog => {
            const cedula = prog.cedula.toString();
            // Procesamos el horario (ej: "13:40 - 21:00") para sacar el neto de horas
            const horasProgramadas = this.calcularHorasDeRango(prog.horarioProgramacion);
            const horasADescontar = prog.tiempoADescontar || 0;
            const horasNetas = Math.max(0, horasProgramadas - horasADescontar);

            if (!programadasPorUsuario[cedula]) {
                programadasPorUsuario[cedula] = {
                    totalProgramadas: 0,
                    detalle: []
                };
            }
            programadasPorUsuario[cedula].totalProgramadas += horasNetas;
            programadasPorUsuario[cedula].detalle.push({
                fecha: prog.fechaProgramacion,
                horario: prog.horarioProgramacion,
                descuento: horasADescontar,
                neto: horasNetas
            });
        });

        // 3. Unificar Datos y Enriquecer con Operador
        const reporte: ReporteMantenimiento[] = [];
        const todasLasCedulasStrings = Array.from(new Set([
            ...Object.keys(realizadasPorUsuario),
            ...Object.keys(programadasPorUsuario)
        ]));

        const todasLasCedulasNumbers = todasLasCedulasStrings.map(c => parseInt(c)).filter(n => !isNaN(n));

        let operadores: Operador[] = [];
        if (todasLasCedulasNumbers.length > 0) {
            operadores = await this.operadorRepo.createQueryBuilder('operador')
                .where('operador.cedula IN (:...cedulas)', { cedulas: todasLasCedulasNumbers })
                .getMany();
        }

        const operadoresMap = new Map(operadores.map(u => [u.cedula, u]));

        todasLasCedulasStrings.forEach(cedulaStr => {
            const cedulaNum = parseInt(cedulaStr);
            const datosRealizados = realizadasPorUsuario[cedulaStr] || { totalRealizadas: 0, detalle: [] };
            const datosProgramados = programadasPorUsuario[cedulaStr] || { totalProgramadas: 0, detalle: [] };
            const operador = operadoresMap.get(cedulaNum);

            const cumplimiento = datosProgramados.totalProgramadas > 0
                ? (datosRealizados.totalRealizadas / datosProgramados.totalProgramadas) * 100
                : 0;

            if (operador || datosRealizados.totalRealizadas > 0 || datosProgramados.totalProgramadas > 0) {
                reporte.push({
                    cedula: cedulaStr,
                    nombre: operador?.nombre || 'Desconocido',
                    rangoLabel: 'Técnico',
                    rol: operador?.rol || 'Mantenimiento',
                    imagen: `https://ui-avatars.com/api/?name=${operador?.nombre || 'Unknown'}&background=random`,
                    horasRealizadas: datosRealizados.totalRealizadas.toFixed(1),
                    horasProgramadas: datosProgramados.totalProgramadas.toFixed(1),
                    cumplimiento: cumplimiento.toFixed(1) + '%',
                    rango: this.determinarRango(cumplimiento),
                    detalleRealizado: datosRealizados.detalle,
                    detalleProgramado: datosProgramados.detalle,
                    codigo: operador?.codigo?.toString() || '---',
                    zona: operador?.zona || 'Sin zona',
                    padrino: operador?.padrino || 'No asignado',
                    ingreso: '---',
                    edad: '---',
                    antiguedad: '---'
                });
            }
        });

        // 4. Enriquecimiento SQL Server
        if (reporte.length > 0) {
            const normalizar = (c: any) => String(c).trim().replace(/^0+/, '');
            const cedulasReporte = reporte.map(r => r.cedula);
            const enrichedMap = new Map();

            try {
                const batchSize = 1000;
                for (let i = 0; i < cedulasReporte.length; i += batchSize) {
                    const batch = cedulasReporte.slice(i, i + batchSize);
                    const query = `
                        WITH LatestCargo AS (
                            SELECT 
                                f_nit_empl, f_desc_cargo, f_nombre_empl, 
                                f_fecha_nacimiento_emp, f_fecha_ingreso, f_fecha_retiro,
                                ROW_NUMBER() OVER (PARTITION BY f_nit_empl ORDER BY f_parametro DESC, f_ndc DESC) as rn
                            FROM SE_W0550
                            WHERE f_nit_empl IN (${batch.map((_, idx) => '@' + idx).join(",")})
                            OR (ISNUMERIC(f_nit_empl) = 1 AND CAST(f_nit_empl AS BIGINT) IN (${batch.map((_, idx) => '@' + (idx + batch.length)).join(",")}))
                        )
                        SELECT f_nit_empl, f_desc_cargo, f_nombre_empl, f_fecha_nacimiento_emp, f_fecha_ingreso, f_fecha_retiro
                        FROM LatestCargo
                        WHERE rn = 1
                    `;
                    const enriquecidos = await this.sqlServerDataSource.query(query, [...batch, ...batch]);
                    enriquecidos.forEach((e) => enrichedMap.set(normalizar(e.f_nit_empl), e));
                }

                reporte.forEach(r => {
                    const extra = enrichedMap.get(normalizar(r.cedula));
                    if (extra) {
                        r.nombre = extra.f_nombre_empl || r.nombre;
                        r.rol = extra.f_desc_cargo || r.rol;
                        r.ingreso = extra.f_fecha_ingreso || '---';
                        r.edad = this.calcularEdad(extra.f_fecha_nacimiento_emp);
                        r.antiguedad = this.calcularAntiguedad(extra.f_fecha_ingreso);
                        r.imagen = `https://admon.sao6.com.co/web/uploads/empleados/${r.cedula}.jpg`;
                    }
                });
            } catch (error) {
                console.error("Error enriqueciendo mantenimiento:", error);
            }
        }

        return reporte.sort((a, b) => parseFloat(b.cumplimiento) - parseFloat(a.cumplimiento));
    }

    private calcularEdad(fecha: any): string {
        if (!fecha) return '---';
        const birth = new Date(fecha);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
        return `${age} años`;
    }

    private calcularAntiguedad(fecha: any): string {
        if (!fecha) return '---';
        const start = new Date(fecha);
        const now = new Date();
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        if (months < 0) { years--; months += 12; }
        return `${years} años, ${months} meses`;
    }

    private determinarRango(cumplimiento: number): string {
        if (cumplimiento >= 95) return 'ORO';
        if (cumplimiento >= 85) return 'PLATA';
        return 'BRONCE';
    }

    private calcularHorasDeRango(rango: string): number {
        if (!rango) return 0;

        // Buscamos patrones de HH:mm - HH:mm
        const rangeRegex = /(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})/g;
        let match;
        let totalHours = 0;

        while ((match = rangeRegex.exec(rango)) !== null) {
            const [_, startStr, endStr] = match;
            try {
                const [startH, startM] = startStr.split(':').map(Number);
                const [endH, endM] = endStr.split(':').map(Number);

                let startMinutes = startH * 60 + startM;
                let endMinutes = endH * 60 + endM;

                if (endMinutes < startMinutes) {
                    endMinutes += 24 * 60; // Salto de día
                }

                totalHours += (endMinutes - startMinutes) / 60;
            } catch (e) {
                console.error("Error al calcular horas de segmento:", rango, e);
            }
        }

        // Fallback: si es un número directo
        if (totalHours === 0 && !isNaN(Number(rango))) {
            return Number(rango);
        }

        return totalHours;
    }
}
