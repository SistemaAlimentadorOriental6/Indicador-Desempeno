import { Controller, Get, Query, Param } from '@nestjs/common';
import { DesempenoService } from './desempeno.service';

@Controller('desempeno')
export class DesempenoController {
    constructor(private readonly desempenoService: DesempenoService) { }

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
