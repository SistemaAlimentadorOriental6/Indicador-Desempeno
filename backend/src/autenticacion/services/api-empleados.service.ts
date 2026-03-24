import { Injectable, Logger } from '@nestjs/common';

export interface OperadorApiExterna {
    CodigoOperador: string;
    Cedula: string;
}

// Interfaz para la respuesta de la API
interface RespuestaApiEmpleados {
    status: boolean;
    count: number;
    data: OperadorApiExterna[];
}

@Injectable()
export class ApiEmpleadosService {
    private readonly logger = new Logger(ApiEmpleadosService.name);
    private readonly apiUrl = 'https://adbordo.valliu.co:8443/api/employee';
    private readonly apiKey = '8665a3353428668d59e195b30b00537288626fd6';

    // Cache para almacenar los empleados y evitar llamadas repetidas
    private cacheEmpleados: OperadorApiExterna[] = [];
    private ultimaActualizacion: Date | null = null;
    private readonly tiempoExpiracionCache = 5 * 60 * 1000; // 5 minutos en milisegundos

    /**
     * Obtiene todos los empleados desde la API externa
     * Implementa un sistema de cache para optimizar el rendimiento
     */
    async obtenerTodosLosEmpleados(): Promise<OperadorApiExterna[]> {
        // Verificar si el cache es válido
        if (this.cacheEsValido()) {
            this.logger.debug('Usando cache de empleados');
            return this.cacheEmpleados;
        }

        try {
            this.logger.log('Consultando API externa de empleados...');

            // Desactivar verificación SSL para evitar problemas con certificados
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

            const respuesta = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status} - ${respuesta.statusText}`);
            }

            const datos: RespuestaApiEmpleados = await respuesta.json();

            if (!datos.status) {
                throw new Error('La API retornó status false');
            }

            this.logger.log(`Se obtuvieron ${datos.count} empleados de la API externa`);

            // Actualizar cache y formatear códigos a 4 dígitos
            this.cacheEmpleados = datos.data.map(emp => ({
                ...emp,
                CodigoOperador: String(emp.CodigoOperador).padStart(4, '0')
            }));
            this.ultimaActualizacion = new Date();

            return this.cacheEmpleados;

        } catch (error) {
            this.logger.error('Error al consultar API de empleados:', error.message);

            // Si hay cache previo, usarlo como fallback
            if (this.cacheEmpleados.length > 0) {
                this.logger.warn('Usando cache anterior como fallback');
                return this.cacheEmpleados;
            }

            throw error;
        }
    }

    /**
     * Busca un empleado por su código de operador
     */
    async buscarPorCodigoOperador(codigo: string): Promise<OperadorApiExterna | null> {
        const empleados = await this.obtenerTodosLosEmpleados();
        return empleados.find(e => e.CodigoOperador === codigo) || null;
    }

    /**
     * Busca un empleado por su cédula
     */
    async buscarPorCedula(cedula: string): Promise<OperadorApiExterna | null> {
        const empleados = await this.obtenerTodosLosEmpleados();
        return empleados.find(e => e.Cedula === cedula) || null;
    }

    /**
     * Verifica si el cache es válido (no ha expirado)
     */
    private cacheEsValido(): boolean {
        if (!this.ultimaActualizacion || this.cacheEmpleados.length === 0) {
            return false;
        }

        const tiempoTranscurrido = Date.now() - this.ultimaActualizacion.getTime();
        return tiempoTranscurrido < this.tiempoExpiracionCache;
    }

    /**
     * Limpia el cache manualmente (útil para pruebas o actualizaciones forzadas)
     */
    limpiarCache(): void {
        this.cacheEmpleados = [];
        this.ultimaActualizacion = null;
        this.logger.log('Cache de empleados limpiado');
    }
}
