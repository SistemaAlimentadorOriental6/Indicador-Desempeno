import { API_CONFIG, getApiUrl } from "@config/api";
import type { FiltrosData } from "./FiltroService";

export interface OperadorBono {
    codigo: string;
    nombre: string;
    cedula: string;
    cargo: string;
    rango: string;
    bonosProgreso: number;
    isActive: boolean;
}

export interface BonoStats {
    total: number;
    porRango: Record<string, number>;
}

export class BonoService {
    // Excepciones de cargo hardcoded en la UI original
    private static readonly EXCEPCIONES_CARGO: Record<string, string> = {
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

    /**
     * Obtiene y procesa todos los operadores con sus métricas de bono.
     */
    static async obtenerOperadoresConBono(filtros: FiltrosData): Promise<OperadorBono[]> {
        try {
            let rankingUrl = getApiUrl(API_CONFIG.ENDPOINTS.DESEMPENO.GET_RANKING);

            if (filtros.periodo.tipo !== "all") {
                const p = new URLSearchParams();
                p.append("anio", filtros.periodo.anio.toString());
                if (filtros.periodo.tipo === "month") {
                    p.append("mes", (filtros.periodo.mes).toString());
                }
                rankingUrl += `?${p.toString()}`;
            }

            const [respOps, respRank] = await Promise.all([
                fetch(getApiUrl(API_CONFIG.ENDPOINTS.OPERADORES.GET_ALL)),
                fetch(rankingUrl),
            ]);

            if (!respOps.ok || !respRank.ok) {
                throw new Error("Error al obtener datos de la API");
            }

            const operators = await respOps.json();
            const rankingData = await respRank.json();

            const rankingMap = new Map();
            rankingData.forEach((item: any) => rankingMap.set(item.codigo, item));

            return operators.map((op: any) => {
                const cedula = op.cedula || "";
                let cargo = op.cargo;
                if (this.EXCEPCIONES_CARGO[cedula]) {
                    cargo = this.EXCEPCIONES_CARGO[cedula];
                }

                const metrics = rankingMap.get(op.codigo) || {
                    rango: "Taller Conciencia",
                    bonosProgreso: 0,
                };

                return {
                    codigo: op.codigo,
                    nombre: op.nombre,
                    cedula: cedula,
                    cargo: cargo,
                    rango: metrics.rango || "Taller Conciencia",
                    bonosProgreso: metrics.bonosProgreso || 0,
                    isActive: !op.fechaRetiro,
                };
            });
        } catch (error) {
            console.error("Error en BonoService:", error);
            throw error;
        }
    }

    /**
     * Filtra los operadores según los criterios de búsqueda y filtros.
     */
    static filtrarOperadores(operadores: OperadorBono[], filtros: FiltrosData): OperadorBono[] {
        return operadores.filter((op) => {
            // Filtro de búsqueda
            if (filtros.busqueda) {
                const search = filtros.busqueda.toLowerCase();
                const match = 
                    op.nombre.toLowerCase().includes(search) || 
                    op.cedula.includes(search) || 
                    op.codigo.includes(search);
                if (!match) return false;
            }

            // Filtro de estado
            if (filtros.estado === "active" && !op.isActive) return false;
            if (filtros.estado === "inactive" && op.isActive) return false;

            // Filtro de cargo
            if (filtros.cargo && filtros.cargo !== "all" && op.cargo !== filtros.cargo) return false;

            return true;
        });
    }

    /**
     * Calcula las estadísticas de bono para los operadores que tienen cumplimiento del 100%.
     */
    static calcularEstadisticas(operadores: OperadorBono[]): BonoStats {
        const porRango: Record<string, number> = {
            Oro: 0,
            Plata: 0,
            Bronce: 0,
            Mejorar: 0,
        };

        let total = 0;

        operadores.forEach((op) => {
            // Lógica: 100% de bono y NO ser de Taller Conciencia
            if (op.bonosProgreso >= 100 && op.rango !== "Taller Conciencia") {
                if (porRango[op.rango] !== undefined) {
                    porRango[op.rango]++;
                    total++;
                }
            }
        });

        return {
            total,
            porRango,
        };
    }
}
