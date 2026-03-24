import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Raw, DataSource } from 'typeorm';
import { VariableControl } from './entities/variable-control.entity';
import { Novedad } from './entities/novedad.entity';
import { ApiEmpleadosService } from '../autenticacion/services/api-empleados.service';

const DEDUCTION_RULES = [
    { item: '0', causa: 'Sin Deducción', porcentajeRetirar: 0, afectaDesempeno: false },
    { item: '1', causa: 'Incapacidad', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: '2', causa: 'Ausentismo', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: '5', causa: 'Retardo', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: '6', causa: 'Renuncia', porcentajeRetirar: 'Día', afectaDesempeno: true },
    { item: '8', causa: 'Suspensión', porcentajeRetirar: 'Día', afectaDesempeno: true },
    { item: '10', causa: 'Restricción', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: '12', causa: 'Retardo por Horas', porcentajeRetirar: 0.50, afectaDesempeno: true },
    { item: '3', causa: 'Incapacidad > 7 días', porcentajeRetirar: 'Día', afectaDesempeno: true },
    { item: '4', causa: 'Calamidad', porcentajeRetirar: 'Día', afectaDesempeno: false },
    { item: '7', causa: 'Vacaciones', porcentajeRetirar: 'Día', afectaDesempeno: false },
    { item: '9', causa: 'No Ingreso', porcentajeRetirar: 'Día', afectaDesempeno: false },
    { item: '11', causa: 'Día No Remunerado', porcentajeRetirar: 'Día', afectaDesempeno: false },
    { item: '13', causa: 'Día No Remunerado por Horas', porcentajeRetirar: 0, afectaDesempeno: false },
    { item: 'DL', causa: 'Daño Leve', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: 'DG', causa: 'Daño Grave', porcentajeRetirar: 0.50, afectaDesempeno: true },
    { item: 'DGV', causa: 'Daño Gravísimo', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: 'DEL', causa: 'Desincentivo Leve', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: 'DEG', causa: 'Desincentivo Grave', porcentajeRetirar: 0.50, afectaDesempeno: true },
    { item: 'DEGV', causa: 'Desincentivo Gravísimo', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: 'INT', causa: 'Incumplimiento Interno', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: 'OM', causa: 'Falta Menor', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: 'OMD', causa: 'Falta MeDía', porcentajeRetirar: 0.50, afectaDesempeno: true },
    { item: 'OG', causa: 'Falta Grave', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: 'NPF', causa: 'No presentarse a formación', porcentajeRetirar: 1.00, afectaDesempeno: true },
    { item: 'HCC-L', causa: 'Hábitos, Conductas Y Comportamientos - Leve', porcentajeRetirar: 0.25, afectaDesempeno: true },
    { item: 'HCC-G', causa: 'Hábitos, Conductas Y Comportamientos - Grave', porcentajeRetirar: 0.50, afectaDesempeno: true },
    { item: 'HCC-GV', causa: 'Hábitos, Conductas Y Comportamientos - Gravísimo', porcentajeRetirar: 1.00, afectaDesempeno: true },
];

@Injectable()
export class DesempenoService {
    constructor(
        @InjectRepository(VariableControl)
        private readonly variableControlRepository: Repository<VariableControl>,
        @InjectRepository(Novedad)
        private readonly novedadRepository: Repository<Novedad>,
        @InjectDataSource('sqlserver')
        private readonly sqlServerDataSource: DataSource,
        private readonly apiEmpleadosService: ApiEmpleadosService,
    ) { }

    async obtenerDesempenoPorAnio(codigoEmpleado: string, anio: number) {
        // Normalizar entrada para búsqueda
        const codigoBusqueda = String(parseInt(codigoEmpleado));

        // Obtener el cargo del empleado (lo necesitamos para 2026+)
        let cargoEmpleado = 'OPERADOR';
        try {
            const empApi = await this.apiEmpleadosService.obtenerTodosLosEmpleados();
            const empleado = empApi.find((e) => e.CodigoOperador === String(codigoEmpleado).padStart(4, '0'));
            
            const excepcionesCargo: Record<string, string> = {
                "76305225": "OPERADOR REUBICADO",
                "71680464": "OPERADOR REUBICADO",
                "71685483": "OPERADOR REUBICADO",
                "18395828": "OPERADOR REUBICADO",
                "98577522": "OPERADOR REUBICADO",
                "98575332": "OPERADOR REUBICADO",
                "13886212": "OPERADOR REUBICADO",
                "71665896": "OPERADOR REUBICADO",
                "98593153": "OPERADOR REUBICADO",
                "98451399": "OPERADOR REUBICADO",
                "71769615": "OPERADOR REUBICADO",
                "1017130322": "OPERADOR 1.5 SMLV",
                "15384809": "OPERADOR 1.5 SMLV",
                "8013217": "OPERADOR 1.5 SMLV",
                "70330438": "OPERADOR 1.5 SMLV",
                "71337548": "OPERADOR 1.5 SMLV",
                "71644706": "OPERADOR 1.5 SMLV",
                "71653095": "OPERADOR 1.5 SMLV",
                "71655264": "OPERADOR 1.5 SMLV",
                "71743050": "OPERADOR 1.5 SMLV",
                "71750594": "OPERADOR 1.5 SMLV",
                "71763151": "OPERADOR 1.5 SMLV",
                "98464593": "OPERADOR 1.5 SMLV",
                "98506999": "OPERADOR 1.5 SMLV",
                "98517588": "OPERADOR 1.5 SMLV",
                "98707206": "OPERADOR 1.5 SMLV",
                "1035853821": "OPERADOR 1.5 SMLV",
                "98565206": "OPERADOR REPOSTAJE",
                "71261139": "OPERADOR REPOSTAJE"
            };

            if (empleado) {
                const cedulaNorm = String(empleado.Cedula).trim().replace(/^0+/, '');
                if (excepcionesCargo[cedulaNorm]) {
                    cargoEmpleado = excepcionesCargo[cedulaNorm];
                } else {
                    const querySql = `
                        SELECT TOP 1 f_desc_cargo
                        FROM SE_W0550
                        WHERE f_nit_empl = @0
                        OR (ISNUMERIC(f_nit_empl) = 1 AND CAST(f_nit_empl AS BIGINT) = CAST(@0 AS BIGINT))
                        ORDER BY f_parametro DESC, f_ndc DESC
                    `;
                    const result = await this.sqlServerDataSource.query(querySql, [empleado.Cedula]);
                    if (result && result.length > 0) {
                        cargoEmpleado = result[0].f_desc_cargo;
                    }
                }
                console.log(`[CARGO] Operador ${codigoEmpleado} cedula=${empleado.Cedula} -> cargo="${cargoEmpleado}"`);
            }
        } catch (error) {
            console.error('Error al obtener cargo para bono:', error);
        }

        // 1. Obtener registros de variables_control
        const registros = await this.variableControlRepository.query(
            `SELECT * FROM variables_control 
             WHERE LPAD(codigo_empleado, 4, '0') = ? 
             AND YEAR(fecha_inicio_programacion) = ? 
             ORDER BY fecha_inicio_programacion ASC`,
            [String(codigoEmpleado).padStart(4, '0'), anio]
        );

        // 2. Obtener todas las novedades del empleado para el historial
        const todasLasNovedades = await this.novedadRepository.query(
            `SELECT 
                codigo_empleado as codigoEmpleado, 
                codigo_factor as codigoFactor, 
                fecha_inicio_novedad as fechaInicioNovedad,
                fecha_fin_novedad as fechaFinNovedad
             FROM novedades WHERE LPAD(codigo_empleado, 4, '0') = ?`,
            [String(codigoEmpleado).padStart(4, '0')]
        );

        const novedades = todasLasNovedades.filter(n =>
            new Date(n.fechaInicioNovedad).getUTCFullYear() === anio
        );

        // Procesar Historial para el Modal
        const aniosConReg: number[] = Array.from(new Set(todasLasNovedades.map((n: any) => new Date(n.fechaInicioNovedad).getUTCFullYear())));
        const tiposUnicos: string[] = Array.from(new Set(todasLasNovedades.map((n: any) => n.codigoFactor)));

        const historySummary = {
            totalNovedades: todasLasNovedades.length,
            aniosConRegistro: aniosConReg.length,
            tiposDiferentes: tiposUnicos.length,
            promedioAnual: aniosConReg.length > 0 ? parseFloat((todasLasNovedades.length / aniosConReg.length).toFixed(1)) : 0,
            distribucionPorAnio: aniosConReg.map(y => ({
                anio: y,
                total: todasLasNovedades.filter((n: any) => new Date(n.fechaInicioNovedad).getUTCFullYear() === y).length
            })).sort((a: any, b: any) => b.anio - a.anio)
        };

        // Matriz de novedades agrupada por factor con conteo por año
        const matrizNovedades = tiposUnicos.map(factor => {
            const rule = DEDUCTION_RULES.find(r => r.item === factor);
            const novsFactor = todasLasNovedades.filter((n: any) => n.codigoFactor === factor);

            const porAnio: Record<number, number> = {};
            aniosConReg.forEach(y => {
                porAnio[y] = novsFactor.filter((n: any) => new Date(n.fechaInicioNovedad).getUTCFullYear() === y).length;
            });

            return {
                factor,
                label: rule ? rule.causa : factor,
                total: novsFactor.length,
                porAnio
            };
        });

        const variableCodes: string[] = Array.from(new Set(registros.map((r: any) => r.codigo_variable)));
        const variablesData: any = {};

        // Procesar variables de variables_control
        variableCodes.forEach(code => {
            const statsPorMes = Array(12).fill(null).map((_, index) => ({
                mesIndex: index,
                nombreMes: this.obtenerNombreMes(index),
                valorProgramado: 0,
                valorEjecutado: 0,
                cumplimiento: 0,
                registros: 0
            }));

            let totalEjecutadoVar = 0;
            let totalProgramadoVar = 0;

            const registrosVar = registros.filter((r: any) => r.codigo_variable === code);

            registrosVar.forEach((reg: any) => {
                const mes = new Date(reg.fecha_inicio_programacion).getUTCMonth();
                statsPorMes[mes].valorProgramado += reg.valor_programacion || 0;
                statsPorMes[mes].valorEjecutado += reg.valor_ejecucion || 0;
                statsPorMes[mes].registros++;

                totalEjecutadoVar += reg.valor_ejecucion || 0;
                totalProgramadoVar += reg.valor_programacion || 0;
            });

            statsPorMes.forEach(stat => {
                if (stat.valorProgramado > 0) {
                    stat.cumplimiento = parseFloat(((stat.valorEjecutado / stat.valorProgramado) * 100).toFixed(1));
                }
            });

            variablesData[code] = {
                codigoVariable: code,
                totalEjecutado: Math.round(totalEjecutadoVar),
                totalProgramado: Math.round(totalProgramadoVar),
                cumplimientoTotal: totalProgramadoVar > 0 ? parseFloat(((totalEjecutadoVar / totalProgramadoVar) * 100).toFixed(1)) : 0,
                mensual: statsPorMes
            };
        });

        // 3. Cálculo de la variable BONO basada en novedades
        const baseBonus = this.getBaseBonusForYearAndRole(anio, cargoEmpleado);
        // Para OPERADOR 1.5 SMLV, el valor monetario es 0 pero la eficiencia usa el bono del OPERADOR normal
        const esOperador15SMLV = this.normalizarCargo(cargoEmpleado) === 'OPERADOR 1.5 SMLV';
        const baseBonusParaEficiencia = esOperador15SMLV
            ? this.getBaseBonusForYearAndRole(anio, 'OPERADOR')
            : baseBonus;

        // Inicializar acumuladores por mes (Bono en 0 por defecto)
        const statsBonoMes = Array(12).fill(null).map((_, index) => ({
            mesIndex: index,
            nombreMes: this.obtenerNombreMes(index),
            valorProgramado: baseBonus, // El valor real del bono para la UI (0 para 1.5 SMLV)
            valorBaseEficiencia: baseBonusParaEficiencia, // El valor usado para calcular porcentajes
            valorEjecutado: 0,
            valorParaCumplimiento: 0,
            cumplimiento: 0,
            registros: 0,
            tieneDatos: false,
            deduccionReal: 0,
            deduccionAfecta: 0
        }));

        novedades.forEach(nov => {
            const mes = new Date(nov.fechaInicioNovedad).getUTCMonth();
            statsBonoMes[mes].tieneDatos = true;
            statsBonoMes[mes].registros++;

            const rule = DEDUCTION_RULES.find(r => r.item === nov.codigoFactor);
            if (rule && nov.codigoFactor !== '0') {
                let deduccion = 0;

                if (rule.porcentajeRetirar === 'Día') {
                    // Calcular el número de días entre fecha_inicio y fecha_fin
                    const fechaInicio = new Date(nov.fechaInicioNovedad);
                    const fechaFin = new Date(nov.fechaFinNovedad);

                    // Calcular diferencia en días (incluyendo ambos extremos)
                    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                    // Deducción por día multiplicado por el número de días
                    deduccion = (baseBonusParaEficiencia / 30) * diffDays;
                } else {
                    deduccion = baseBonusParaEficiencia * (rule.porcentajeRetirar as number);
                }

                statsBonoMes[mes].deduccionReal += deduccion;
                if (rule.afectaDesempeno) {
                    statsBonoMes[mes].deduccionAfecta += deduccion;
                }
            }
        });

        let totalBonoProgramado = 0;
        let totalBonoEjecutado = 0;
        let totalBonoParaCumplimiento = 0;

        statsBonoMes.forEach(stat => {
            if (stat.tieneDatos) {
                // Para OPERADOR 1.5 SMLV: valor monetario 0, eficiencia calculada con base normal
                stat.valorEjecutado = esOperador15SMLV ? 0 : Math.max(0, Math.round(baseBonusParaEficiencia - stat.deduccionReal));
                stat.valorParaCumplimiento = Math.max(0, Math.round(baseBonusParaEficiencia - stat.deduccionAfecta));
                stat.cumplimiento = stat.valorBaseEficiencia > 0
                    ? parseFloat(((stat.valorParaCumplimiento / stat.valorBaseEficiencia) * 100).toFixed(1))
                    : 0;
            } else {
                // Sin registros en la tabla novedades, el bono es 0%
                stat.valorEjecutado = 0;
                stat.valorParaCumplimiento = 0;
                stat.cumplimiento = 0;
            }

            totalBonoProgramado += stat.valorProgramado;
            totalBonoEjecutado += stat.valorEjecutado;
            totalBonoParaCumplimiento += stat.valorParaCumplimiento;
        });

        const bonoMensualValido = statsBonoMes.filter(s => s.tieneDatos);
        const cumplimientoTotalBono = bonoMensualValido.length > 0
            ? parseFloat((bonoMensualValido.reduce((acc, s) => acc + s.cumplimiento, 0) / bonoMensualValido.length).toFixed(1))
            : 0;

        variablesData['BONO'] = {
            codigoVariable: 'BONO',
            totalEjecutado: totalBonoEjecutado,
            totalProgramado: totalBonoProgramado,
            cumplimientoTotal: cumplimientoTotalBono,
            mensual: statsBonoMes
        };

        const mainVarCode = variableCodes.includes('KMS') ? 'KMS' : (variableCodes.includes('KM') ? 'KM' : 'BONO');
        const mainMetrics = variablesData[mainVarCode];

        // Calcular el cumplimiento global del periodo promediando solo los meses que tienen datos
        // (Promedio de las variables principales: KM y BONO)
        const kmsData = variablesData['KMS'] || variablesData['KM'];
        const kmMensualValido = kmsData ? kmsData.mensual.filter((m: any) => m.registros > 0) : [];

        const avgKm = kmMensualValido.length > 0
            ? kmMensualValido.reduce((acc: number, m: any) => acc + m.cumplimiento, 0) / kmMensualValido.length
            : 0;

        const avgBono = bonoMensualValido.length > 0
            ? bonoMensualValido.reduce((acc: number, s: any) => acc + s.cumplimiento, 0) / bonoMensualValido.length
            : 0;

        const globalEfficiency = (kmMensualValido.length > 0 && bonoMensualValido.length > 0)
            ? (avgKm + avgBono) / 2
            : (kmMensualValido.length > 0 ? avgKm : (bonoMensualValido.length > 0 ? avgBono : 0));

        return {
            anio,
            ...mainMetrics,
            cumplimientoTotal: parseFloat(globalEfficiency.toFixed(1)),
            variables: variablesData,
            status: mainMetrics ? 'success' : 'no_data',
            cantidadNovedades: novedades.length,
            novedadesSummary: historySummary,
            matrizNovedades,
            novedadesRaw: todasLasNovedades, // Exportamos todas para el modal de detalles
            baseBonus,
            baseBonusParaEficiencia,
            deductionRules: DEDUCTION_RULES
        };
    }

    async getAniosDisponibles(codigoEmpleado: string) {
        const raw = await this.variableControlRepository.query(
            `SELECT DISTINCT YEAR(fecha_inicio_programacion) as anio 
             FROM variables_control 
             WHERE LPAD(codigo_empleado, 4, '0') = ? 
             ORDER BY anio DESC`,
            [String(codigoEmpleado).padStart(4, '0')]
        );

        return raw.map(r => r.anio);
    }

    async obtenerRankingGeneral(anio?: number, mes?: number) {
        // Query para obtener datos MENSUALES de cada empleado
        let whereClause = "";
        let params: any[] = [];

        if (anio && mes !== undefined && mes !== -1) {
            whereClause = `AND YEAR(vc.fecha_inicio_programacion) = ? AND MONTH(vc.fecha_inicio_programacion) = ?`;
            params = [anio, mes + 1];
        } else if (anio) {
            whereClause = `AND YEAR(vc.fecha_inicio_programacion) = ?`;
            params = [anio];
        }

        // Consulta que devuelve datos MENSUALES para cada empleado
        const queryMensual = `
            SELECT 
                vc.codigo_empleado as codigoEmpleado,
                MONTH(vc.fecha_inicio_programacion) as mes,
                YEAR(vc.fecha_inicio_programacion) as anio,
                vc.fecha_inicio_programacion as fecha,
                SUM(vc.valor_programacion) as progMes,
                SUM(vc.valor_ejecucion) as ejecMes
            FROM variables_control vc
            WHERE vc.codigo_variable IN ('KM', 'KMS')
            ${whereClause}
            GROUP BY vc.codigo_empleado, YEAR(vc.fecha_inicio_programacion), MONTH(vc.fecha_inicio_programacion)
            ORDER BY vc.codigo_empleado, YEAR(vc.fecha_inicio_programacion), MONTH(vc.fecha_inicio_programacion)
        `;

        const kmMensualData = await this.variableControlRepository.query(queryMensual, params);

        // Obtener la lista de operadores y sus cargos para el cálculo de bonos 2026+
        let operadoresCargos = new Map<string, string>();
        try {
            const empApi = await this.apiEmpleadosService.obtenerTodosLosEmpleados();
            const cedulas = empApi.map((e) => e.Cedula);
            
            // Obtener cargos en lotes
            const batchSize = 1000;
            const enrichedMap = new Map();
            for (let i = 0; i < cedulas.length; i += batchSize) {
                const batch = cedulas.slice(i, i + batchSize);
                const query = `
                    WITH LatestCargo AS (
                        SELECT 
                            f_nit_empl, f_desc_cargo,
                            ROW_NUMBER() OVER (PARTITION BY f_nit_empl ORDER BY f_parametro DESC, f_ndc DESC) as rn
                        FROM SE_W0550
                        WHERE f_nit_empl IN (${batch.map((_, idx) => '@' + idx).join(",")})
                        OR (ISNUMERIC(f_nit_empl) = 1 AND CAST(f_nit_empl AS BIGINT) IN (${batch.map((_, idx) => '@' + (idx + batch.length)).join(",")}))
                    )
                    SELECT f_nit_empl, f_desc_cargo FROM LatestCargo WHERE rn = 1
                `;
                const enriquecidos = await this.sqlServerDataSource.query(query, [...batch, ...batch]);
                enriquecidos.forEach((e: any) => enrichedMap.set(String(e.f_nit_empl).trim().replace(/^0+/, ''), e.f_desc_cargo));
            }
            
            const excepcionesCargo: Record<string, string> = {
                "76305225": "OPERADOR REUBICADO",
                "71680464": "OPERADOR REUBICADO",
                "71685483": "OPERADOR REUBICADO",
                "18395828": "OPERADOR REUBICADO",
                "98577522": "OPERADOR REUBICADO",
                "98575332": "OPERADOR REUBICADO",
                "13886212": "OPERADOR REUBICADO",
                "71665896": "OPERADOR REUBICADO",
                "98593153": "OPERADOR REUBICADO",
                "98451399": "OPERADOR REUBICADO",
                "71769615": "OPERADOR REUBICADO",
                "1017130322": "OPERADOR 1.5 SMLV",
                "15384809": "OPERADOR 1.5 SMLV",
                "8013217": "OPERADOR 1.5 SMLV",
                "70330438": "OPERADOR 1.5 SMLV",
                "71337548": "OPERADOR 1.5 SMLV",
                "71644706": "OPERADOR 1.5 SMLV",
                "71653095": "OPERADOR 1.5 SMLV",
                "71655264": "OPERADOR 1.5 SMLV",
                "71743050": "OPERADOR 1.5 SMLV",
                "71750594": "OPERADOR 1.5 SMLV",
                "71763151": "OPERADOR 1.5 SMLV",
                "98464593": "OPERADOR 1.5 SMLV",
                "98506999": "OPERADOR 1.5 SMLV",
                "98517588": "OPERADOR 1.5 SMLV",
                "98707206": "OPERADOR 1.5 SMLV",
                "1035853821": "OPERADOR 1.5 SMLV",
                "98565206": "OPERADOR REPOSTAJE",
                "71261139": "OPERADOR REPOSTAJE"
            };

            empApi.forEach((e) => {
                const cedulaNorm = String(e.Cedula).trim().replace(/^0+/, '');
                let cargo = enrichedMap.get(cedulaNorm) || 'OPERADOR';
                if (excepcionesCargo[cedulaNorm]) {
                    cargo = excepcionesCargo[cedulaNorm];
                }
                operadoresCargos.set(String(e.CodigoOperador).padStart(4, '0'), cargo);
            });
        } catch (error) {
            console.error('Error al precargar cargos para ranking:', error);
        }

        // Agrupar datos mensuales por empleado
        const empleadosMap = new Map<string, any[]>();
        kmMensualData.forEach((row: any) => {
            const key = String(row.codigoEmpleado);
            if (!empleadosMap.has(key)) empleadosMap.set(key, []);
            empleadosMap.get(key)!.push(row);
        });

        // Obtener novedades
        let novWhere = "1=1";
        let novParams: any[] = [];
        if (anio && mes !== undefined && mes !== -1) {
            novWhere = "YEAR(fecha_inicio_novedad) = ? AND MONTH(fecha_inicio_novedad) = ?";
            novParams = [anio, mes + 1];
        } else if (anio) {
            novWhere = "YEAR(fecha_inicio_novedad) = ?";
            novParams = [anio];
        } else {
            const currentYear = new Date().getFullYear();
            novWhere = "YEAR(fecha_inicio_novedad) >= ?";
            novParams = [currentYear - 1];
        }

        const novedades = await this.novedadRepository.query(`
            SELECT 
                codigo_empleado as codigoEmpleado, 
                codigo_factor as codigoFactor, 
                fecha_inicio_novedad as fechaInicioNovedad,
                fecha_fin_novedad as fechaFinNovedad
            FROM novedades
            WHERE ${novWhere}
        `, novParams);

        // Agrupar novedades por empleado
        const novedadesMap = new Map();
        novedades.forEach((nov: any) => {
            if (!novedadesMap.has(nov.codigoEmpleado)) novedadesMap.set(nov.codigoEmpleado, []);
            novedadesMap.get(nov.codigoEmpleado).push(nov);
        });

        // Procesar cada empleado
        const Ranking: any[] = [];

        empleadosMap.forEach((mesesData, codigoEmpleado) => {
            const codigo = String(codigoEmpleado).padStart(4, '0');
            const currentAnio = anio || mesesData[0]?.anio || new Date().getFullYear();
            const cargo = operadoresCargos.get(codigo) || 'OPERADOR';
            const baseBonus = this.getBaseBonusForYearAndRole(currentAnio, cargo);
            
            // Para OPERADOR 1.5 SMLV, la eficiencia se basa en el bono de OPERADOR normal
            const esOperador15SMLV = this.normalizarCargo(cargo) === 'OPERADOR 1.5 SMLV';
            const baseBonusParaEficiencia = esOperador15SMLV
                ? this.getBaseBonusForYearAndRole(currentAnio, 'OPERADOR')
                : baseBonus;

            const novsEmpleado = novedadesMap.get(codigoEmpleado) || [];

            // Calcular eficiencias de KM mensuales
            const eficienciasMensuales: { mes: number; kmEff: number; bonoEff: number }[] = [];

            // Info de novedades por mes para el bono
            const mesesInfo = Array(12).fill(null).map(() => ({ activo: false, dedAfecta: 0, dedReal: 0 }));

            // Marcar meses activos basado en datos de KM
            mesesData.forEach((row: any) => {
                const mesIdx = row.mes - 1; // Convertir a 0-indexed
                mesesInfo[mesIdx].activo = true;
            });

            // Procesar novedades
            novsEmpleado.forEach((nov: any) => {
                const mesNov = new Date(nov.fechaInicioNovedad).getUTCMonth();

                const rule = DEDUCTION_RULES.find(r => r.item === nov.codigoFactor);
                if (rule && nov.codigoFactor !== '0') {
                    let ded = 0;

                    if (rule.porcentajeRetirar === 'Día') {
                        const fechaInicio = new Date(nov.fechaInicioNovedad);
                        const fechaFin = new Date(nov.fechaFinNovedad);
                        const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        ded = (baseBonusParaEficiencia / 30) * diffDays;
                    } else {
                        ded = baseBonusParaEficiencia * (rule.porcentajeRetirar as number);
                    }

                    mesesInfo[mesNov].dedReal += ded;
                    if (rule.afectaDesempeno) {
                        mesesInfo[mesNov].dedAfecta += ded;
                    }
                }
            });

            // Calcular eficiencia por cada mes
            mesesData.forEach((row: any) => {
                const mesIdx = row.mes - 1;
                const kmEff = row.progMes > 0 ? (row.ejecMes * 100 / row.progMes) : 0;

                // Bono del mes
                const info = mesesInfo[mesIdx];
                const bonoEjecutado = Math.max(0, baseBonusParaEficiencia - info.dedAfecta);
                const bonoEff = info.activo 
                    ? (baseBonusParaEficiencia > 0 ? (bonoEjecutado * 100 / baseBonusParaEficiencia) : 0)
                    : 100;

                eficienciasMensuales.push({ mes: mesIdx, kmEff, bonoEff });
            });

            // Calcular promedios
            const totalMeses = eficienciasMensuales.length;

            if (totalMeses === 0) return;

            // Promedio anual de eficiencias
            const sumaKmEff = eficienciasMensuales.reduce((acc, m) => acc + m.kmEff, 0);
            const sumaBonoEff = eficienciasMensuales.reduce((acc, m) => acc + m.bonoEff, 0);

            const kmEffAnual = sumaKmEff / totalMeses;
            const bonoEffAnual = sumaBonoEff / totalMeses;
            const efAnual = (kmEffAnual + bonoEffAnual) / 2;

            // Obtener datos del último mes
            const ultimoMesData = mesesData[mesesData.length - 1];
            const ultimoMesIdx = ultimoMesData.mes - 1;
            const ultimaEficiencia = eficienciasMensuales.find(e => e.mes === ultimoMesIdx);

            const kmEffUltimoMes = ultimaEficiencia?.kmEff || 0;
            const bonoEffUltimoMes = ultimaEficiencia?.bonoEff || 0;
            const efUltimoMes = (kmEffUltimoMes + bonoEffUltimoMes) / 2;

            // Valores del último mes
            const infoUltimo = mesesInfo[ultimoMesIdx];
            // Para OPERADOR 1.5 SMLV, el valor monetario es 0 pero la eficiencia se calcula normalmente
            const bonoRealUltimoMes = (cargo === 'OPERADOR 1.5 SMLV') ? 0 : (infoUltimo.activo ? Math.max(0, baseBonus - infoUltimo.dedReal) : 0);

            // DEBUG: Ver diferencia entre mensual y anual
            if (codigo === '0445' || codigo === '3309') { // Primeros operadores para depurar
                console.log(`[${codigo}] Meses activos: ${totalMeses}`);
                eficienciasMensuales.forEach(e => {
                    console.log(`  Mes ${e.mes + 1}: KM=${e.kmEff.toFixed(1)}%, Bono=${e.bonoEff.toFixed(1)}%`);
                });
                console.log(`  ANUAL: KM=${kmEffAnual.toFixed(1)}%, Bono=${bonoEffAnual.toFixed(1)}% => Total=${efAnual.toFixed(1)}%`);
                console.log(`  ÚLTIMO MES (${ultimoMesIdx + 1}): ${efUltimoMes.toFixed(1)}%`);
            }

            Ranking.push({
                codigo,
                eficiencia: efUltimoMes.toFixed(1) + '%',
                efAnual: Math.round(efAnual),
                eficienciaMensual: efUltimoMes.toFixed(1) + '%',
                bonos: `$${Math.round(bonoRealUltimoMes / 1000)}K`,
                km: `${(ultimoMesData.ejecMes / 1000).toFixed(1)}K`,
                kmProgreso: Math.round(kmEffAnual),
                bonosProgreso: Math.round(bonoEffAnual),
                ultimaFecha: ultimoMesData.fecha,
                detalle: {
                    kmPeriodo: kmEffAnual.toFixed(1),
                    bonoPeriodo: bonoEffAnual.toFixed(1),
                    mesesActivos: totalMeses
                },
                rangoBono: this.calcularCategoriaIndividual(Math.round(bonoEffAnual), 'bono'),
                rangoKm: this.calcularCategoriaIndividual(Math.round(kmEffAnual), 'km'),
                rango: this.determinarRangoFinal(
                    this.calcularCategoriaIndividual(Math.round(bonoEffAnual), 'bono'),
                    this.calcularCategoriaIndividual(Math.round(kmEffAnual), 'km')
                )
            });
        });

        return Ranking;
    }

    private normalizarCargo(role: string): string {
        if (!role) return '';
        return role
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    private getBaseBonusForYearAndRole(year: number, role: string): number {
        if (year >= 2026) {
            // Reglas para 2026 en adelante basadas en el cargo (la mitad del valor total)
            if (!role) return 0;
            const cargo = this.normalizarCargo(role);
            
            if (cargo === 'OPERADOR' || cargo === 'OPERADOR REPOSTAJE') return 334500; // 669000 / 2
            if (cargo === 'OPERADOR DIAGNOSTICO' || cargo === 'OPERADOR DE DIAGNOSTICO') return 310000; // 620000 / 2
            if (cargo === 'OPERADOR REUBICADO') return 260000; // 520000 / 2
            if (cargo === 'OPERADOR DE ALISTAMIENTO') return 162000; // 324000 / 2
            if (cargo === 'OPERADOR DUAL') return 175000; // 175000 / 2
            if (cargo === 'OPERADOR 1.5 SMLV') return 0;
            
            console.log(`[CARGO NO RECONOCIDO] "${cargo}" (original: "${role}") -> usando valor por defecto`);
            return 334500; // Valor por defecto si el cargo no coincide
        }

        // Reglas anteriores a 2026
        switch (year) {
            case 2025: return 142000;
            case 2024: return 135000;
            case 2023: return 128000;
            default: return 122000;
        }
    }

    private obtenerNombreMes(index: number): string {
        const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        return meses[index];
    }

    /**
     * Lógica de Categorización (Rangos)
     */
    private readonly CATEGORIAS = {
        ORO: "Oro",
        PLATA: "Plata",
        BRONCE: "Bronce",
        MEJORAR: "Mejorar",
        TALLER: "Taller Conciencia",
    };

    private calcularCategoriaIndividual(valor: number, tipo: 'bono' | 'km'): string {
        if (tipo === 'bono') {
            if (valor >= 100) return this.CATEGORIAS.ORO;
            if (valor >= 95) return this.CATEGORIAS.PLATA;
            if (valor >= 90) return this.CATEGORIAS.BRONCE;
            if (valor >= 60) return this.CATEGORIAS.MEJORAR;
            return this.CATEGORIAS.TALLER;
        } else {
            if (valor >= 94) return this.CATEGORIAS.ORO;
            if (valor >= 90) return this.CATEGORIAS.PLATA;
            if (valor >= 85) return this.CATEGORIAS.BRONCE;
            if (valor >= 70) return this.CATEGORIAS.MEJORAR;
            return this.CATEGORIAS.TALLER;
        }
    }

    private determinarRangoFinal(catBono: string, catKm: string): string {
        const matriz: any = {
            [this.CATEGORIAS.ORO]: {
                [this.CATEGORIAS.ORO]: this.CATEGORIAS.ORO,
                [this.CATEGORIAS.PLATA]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.BRONCE]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.MEJORAR]: this.CATEGORIAS.BRONCE,
                [this.CATEGORIAS.TALLER]: this.CATEGORIAS.BRONCE,
            },
            [this.CATEGORIAS.PLATA]: {
                [this.CATEGORIAS.ORO]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.PLATA]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.BRONCE]: this.CATEGORIAS.BRONCE,
                [this.CATEGORIAS.MEJORAR]: this.CATEGORIAS.BRONCE,
                [this.CATEGORIAS.TALLER]: this.CATEGORIAS.BRONCE,
            },
            [this.CATEGORIAS.BRONCE]: {
                [this.CATEGORIAS.ORO]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.PLATA]: this.CATEGORIAS.PLATA,
                [this.CATEGORIAS.BRONCE]: this.CATEGORIAS.BRONCE,
                [this.CATEGORIAS.MEJORAR]: this.CATEGORIAS.BRONCE,
                [this.CATEGORIAS.TALLER]: this.CATEGORIAS.BRONCE,
            },
            [this.CATEGORIAS.MEJORAR]: {
                [this.CATEGORIAS.ORO]: this.CATEGORIAS.MEJORAR,
                [this.CATEGORIAS.PLATA]: this.CATEGORIAS.MEJORAR,
                [this.CATEGORIAS.BRONCE]: this.CATEGORIAS.MEJORAR,
                [this.CATEGORIAS.MEJORAR]: this.CATEGORIAS.MEJORAR,
                [this.CATEGORIAS.TALLER]: this.CATEGORIAS.TALLER,
            },
            [this.CATEGORIAS.TALLER]: {
                [this.CATEGORIAS.ORO]: this.CATEGORIAS.TALLER,
                [this.CATEGORIAS.PLATA]: this.CATEGORIAS.TALLER,
                [this.CATEGORIAS.BRONCE]: this.CATEGORIAS.TALLER,
                [this.CATEGORIAS.MEJORAR]: this.CATEGORIAS.TALLER,
                [this.CATEGORIAS.TALLER]: this.CATEGORIAS.TALLER,
            },
        };

        return matriz[catBono]?.[catKm] || this.CATEGORIAS.TALLER;
    }
}
