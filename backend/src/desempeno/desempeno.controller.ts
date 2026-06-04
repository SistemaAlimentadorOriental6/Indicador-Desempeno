import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { DesempenoService } from './desempeno.service';
import { ApiEmpleadosService } from '../autenticacion/services/api-empleados.service';

@Controller('desempeno')
export class DesempenoController {
    constructor(
        private readonly desempenoService: DesempenoService,
        private readonly apiEmpleadosService: ApiEmpleadosService,
    ) { }

    @Get('periodos')
    async getPeriodos() {
        return this.desempenoService.getPeriodosDisponibles();
    }

    /**
     * Consulta el resumen de eficiencia de un operador pasando su cédula.
     * GET /desempeno/cedula/:cedula?anio=2025
     * Responde con: eficienciaGlobal, eficienciaMensualKm, eficienciaMensualBono
     */
    @Get('cedula/:cedula')
    async getEficienciaPorCedula(
        @Param('cedula') cedula: string,
        @Query('anio') anio?: string,
    ) {
        const empleado = await this.apiEmpleadosService.buscarPorCedula(cedula.trim());

        if (!empleado) {
            throw new NotFoundException(`No se encontró ningún operador con la cédula ${cedula}`);
        }

        const numericAnio = anio ? parseInt(anio) : new Date().getFullYear();
        const codigoOperador = String(parseInt(empleado.CodigoOperador));

        const datos = await this.desempenoService.obtenerDesempenoPorAnio(codigoOperador, numericAnio);

        // Extraer resumen limpio de las variables calculadas
        const kmsData = datos.variables?.['KMS'] ?? datos.variables?.['KM'] ?? null;
        const bonoData = datos.variables?.['BONO'] ?? null;

        const eficienciaMensualKm = kmsData
            ? kmsData.mensual
                .filter((m: any) => m.registros > 0)
                .map((m: any) => ({
                    mes: m.nombreMes,
                    mesIndex: m.mesIndex,
                    programado: m.valorProgramado,
                    ejecutado: m.valorEjecutado,
                    eficiencia: m.cumplimiento,
                }))
            : [];

        const eficienciaMensualBono = bonoData
            ? bonoData.mensual
                .filter((m: any) => m.tieneDatos)
                .map((m: any) => ({
                    mes: m.nombreMes,
                    mesIndex: m.mesIndex,
                    baseBono: m.valorBaseEficiencia,
                    ejecutado: m.valorParaCumplimiento,
                    eficiencia: m.cumplimiento,
                }))
            : [];

        return {
            cedula,
            codigoOperador: empleado.CodigoOperador,
            anio: numericAnio,
            eficienciaGlobal: datos.cumplimientoTotal,
            eficienciaMensualKm,
            eficienciaMensualBono,
            baseBonus: datos.baseBonus,
        };
    }

    @Get(':codigo/anios')
    async getAnios(@Param('codigo') codigo: string) {
        return this.desempenoService.getAniosDisponibles(codigo);
    }

    @Get('ranking')
    async getRanking(@Query('anio') anio?: string, @Query('mes') mes?: string) {
        const numericAnio = anio ? parseInt(anio) : undefined;
        const numericMes = mes ? parseInt(mes) : undefined;
        return this.desempenoService.obtenerRankingGeneral(numericAnio, numericMes);
    }

    @Get(':codigo')
    async getDesempeno(
        @Param('codigo') codigo: string,
        @Query('anio') anio: any
    ) {
        let numericAnio = parseInt(anio);
        if (isNaN(numericAnio)) {
            numericAnio = new Date().getFullYear();
        }
        return this.desempenoService.obtenerDesempenoPorAnio(codigo, numericAnio);
    }
}
