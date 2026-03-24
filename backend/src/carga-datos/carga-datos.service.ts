import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { VariableControlPrueba } from './entities/variable-control-prueba.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class CargaDatosService {
    constructor(
        @InjectRepository(VariableControlPrueba)
        private readonly repoVariableControl: Repository<VariableControlPrueba>,
    ) { }

    async procesarExcelKilometros(file: Express.Multer.File) {
        return this.procesarExcelGeneral(file, 'KM');
    }

    async procesarExcelNovedades(file: Express.Multer.File) {
        return this.procesarExcelGeneral(file, 'NOV');
    }

    private async procesarExcelGeneral(file: Express.Multer.File, tipo: string) {
        if (!file) throw new BadRequestException('Archivo no proporcionado');

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) throw new BadRequestException('El archivo está vacío');

        // --- VALIDACIÓN DE COLUMNAS ---
        const firstRow = rows[0] as any;
        const actualColumns = Object.keys(firstRow);

        // Columnas requeridas mínimas (según imagen del usuario)
        const requiredMappings = {
            'EMPLEADO': ['CÓDIGO EMPLEADO', 'CODIGO EMPLEADO', 'Cédula'],
            'PROGRAMACION': ['VALOR VAR. PROGRAMACIÓN', 'VALOR VAR. PROGRAM', 'VALOR PROGRAMACION'],
            'EJECUCION': ['VALOR VAR. EJECUCIÓN', 'VALOR VAR. EJECUCIÓ', 'VALOR EJECUCION'],
            'FECHAS': ['FECHA INICIO EJECUCIÓN (YYYY-MM-DD)', 'FECHA FIN EJECUCIÓN (YYYY-MM-DD)']
        };

        const missingColumns: string[] = [];
        for (const [key, options] of Object.entries(requiredMappings)) {
            const found = options.some(opt => actualColumns.some(col => col.includes(opt) || col === opt));
            if (!found) missingColumns.push(key);
        }

        if (missingColumns.length > 0) {
            throw new BadRequestException(`Formato incorrecto. Faltan columnas críticas: ${missingColumns.join(', ')}.`);
        }
        // ------------------------------

        const registrosParaGuardar: VariableControlPrueba[] = [];
        const errores: string[] = [];
        let procesados = 0;
        let duplicados = 0;

        // Set para llevar control de lo que ya validamos en este mismo archivo
        const llavesProcesadasEnVuelo = new Set<string>();

        for (const row of rows as any[]) {
            try {
                // Mapeo EXACTO según la imagen del Excel
                const codigoEmpleado = row['CÓDIGO EMPLEADO'] || row['CODIGO EMPLEADO'] || row['Cédula'];
                const tipoVariableRaw = row['CÓDIGO VARIABLE DE CONTROL'] || tipo;

                const valorProg = row['VALOR VAR. PROGRAMACIÓN'] || row['VALOR VAR. PROGRAM'] || row['VALOR PROGRAMACION'] || 0;
                const valorEjec = row['VALOR VAR. EJECUCIÓN'] || row['VALOR VAR. EJECUCIÓ'] || row['VALOR EJECUCION'] || row['KM'] || 0;

                // Fechas con normalización 
                const dInicioEjec = this.parseDate(row['FECHA INICIO EJECUCIÓN (YYYY-MM-DD)'] || row['FECHA INICIO EJECUCIÓN'] || row['FECHA'] || row['fecha']);
                const dFinEjec = this.parseDate(row['FECHA FIN EJECUCIÓN (YYYY-MM-DD)'] || row['FECHA FIN EJECUCIÓN'] || row['FECHA'] || row['fecha']);

                if (!codigoEmpleado || !dInicioEjec || !dFinEjec) {
                    errores.push(`Fila ${procesados + duplicados + 1}: Datos de empleado o fecha incompletos.`);
                    continue;
                }

                // Normalizar fechas a string YYYY-MM-DD para comparación exacta en DB
                const fInicioEjecStr = dInicioEjec.toISOString().split('T')[0];
                const fFinEjecStr = dFinEjec.toISOString().split('T')[0];

                // Normalizar código de variable (Sincronizar con Excel 'KMS')
                let codigoVariableFinal = tipo; // Valor por defecto
                const rawUpper = tipoVariableRaw.toString().toUpperCase();
                if (rawUpper.includes('KM')) codigoVariableFinal = 'KMS';
                if (rawUpper.includes('NOV')) codigoVariableFinal = 'NOV';

                // Crear una llave única para el registro (Empleado + Variable + Inicio + Fin)
                const uniqueKey = `${codigoEmpleado}-${codigoVariableFinal}-${fInicioEjecStr}-${fFinEjecStr}`;

                // 1. Validar contra duplicados en el MISMO archivo Excel
                if (llavesProcesadasEnVuelo.has(uniqueKey)) {
                    duplicados++;
                    continue;
                }

                // 2. Validar contra la BASE DE DATOS (Usando Raw para comparación de solo fecha)
                const existe = await this.repoVariableControl.findOne({
                    where: {
                        codigoEmpleado: codigoEmpleado.toString(),
                        codigoVariable: codigoVariableFinal,
                        fechaInicioEjecucion: dInicioEjec,
                        fechaFinEjecucion: dFinEjec
                    }
                });

                if (existe) {
                    duplicados++;
                    llavesProcesadasEnVuelo.add(uniqueKey);
                    continue;
                }

                const nuevo = new VariableControlPrueba();
                nuevo.codigoEmpleado = codigoEmpleado.toString();
                nuevo.codigoVariable = codigoVariableFinal;
                nuevo.valorProgramacion = Number(valorProg);
                nuevo.valorEjecucion = Number(valorEjec);
                nuevo.fechaInicioProgramacion = this.parseDate(row['FECHA INICIO PROGRAMACIÓN (YYYY-MM-DD)'] || row['FECHA INICIO PROGRAMACIÓN']) || new Date();
                nuevo.fechaFinProgramacion = this.parseDate(row['FECHA FIN PROGRAMACIÓN (YYYY-MM-DD)'] || row['FECHA FIN PROGRAMACIÓN']) || new Date();
                nuevo.fechaInicioEjecucion = dInicioEjec;
                nuevo.fechaFinEjecucion = dFinEjec;

                registrosParaGuardar.push(nuevo);
                llavesProcesadasEnVuelo.add(uniqueKey);
                procesados++;
            } catch (e) {
                errores.push(`Error en fila ${procesados + duplicados + 1}: ${e.message}`);
            }
        }

        if (registrosParaGuardar.length > 0) {
            await this.repoVariableControl.save(registrosParaGuardar);
        }

        return {
            mensaje: `Carga exitosa: ${procesados} registros nuevos guardados.`,
            resumen: `${duplicados} registros duplicados fueron ignorados para evitar redundancia.`,
            detalles: { procesados, duplicados, errores }
        };
    }

    private parseDate(val: any): Date | null {
        if (!val) return null;
        let d: Date;
        if (typeof val === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            d = new Date(excelEpoch.getTime() + val * 86400000);
        } else {
            d = new Date(val);
        }

        if (isNaN(d.getTime())) return null;

        // Forzar a medianoche para evitar desajustes de tiempo
        d.setHours(0, 0, 0, 0);
        return d;
    }
}
