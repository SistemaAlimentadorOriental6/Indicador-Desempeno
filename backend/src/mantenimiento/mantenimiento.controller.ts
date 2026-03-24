import { Controller, Get, Query } from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';

@Controller('mantenimiento')
export class MantenimientoController {
    constructor(private readonly mantenimientoService: MantenimientoService) { }

    @Get('ranking')
    async obtenerRanking(
        @Query('fechaInicio') fechaInicio: string,
        @Query('fechaFin') fechaFin: string,
    ) {
        if (!fechaInicio || !fechaFin) {
            // Default to last 60 days to ensure data visibility during testing
            const now = new Date();
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const start = new Date();
            start.setDate(now.getDate() - 60);

            fechaInicio = start.toISOString().split('T')[0];
            fechaFin = end.toISOString().split('T')[0];
        }

        // Ensure full datetime format for string comparison if needed, or just passing YYYY-MM-DD
        // If db columns are DATETIME/VARCHAR dates, we might need 'YYYY-MM-DD 00:00:00' and 'YYYY-MM-DD 23:59:59'

        // Adjust logic in Service or here. Let's assume passed dates are 'YYYY-MM-DD' and append time if needed.
        // TareasSolicitadas timestamps might be fully standard.
        // ProgramacionEmpleado is 'Date' type in entity with 'date' column type.

        return this.mantenimientoService.obtenerDesempenoMantenimiento(fechaInicio, fechaFin);
    }
}
