
/**
 * Servicio para manejar la serialización y deserialización de los filtros en la URL (Slugs Personalizados).
 * Proporciona un contexto persistente y semántico para la navegación.
 * Siguiendo la regla de código en español.
 */

export interface FiltrosData {
    busqueda: string;
    estado: 'all' | 'active' | 'inactive' | 'novelty';
    cargo: string;
    ordenar: 'ranking' | 'bonos' | 'km' | 'eficiencia';
    direccion: 'asc' | 'desc';
    pestana: string; // Pestañas de categorías (Oro, Plata, etc)
    bono100Rango?: string | null; // Filtro para bono perfecto
    periodo: {
        tipo: 'all' | 'year' | 'month';
        anio: number;
        mes: number;
    };
}

// Configuración de Slugs (Nombres que aparecen en la URL)
const SLUGS = {
    CLAVES: {
        busqueda: 'buscar',
        estado: 'filtrar_por',
        cargo: 'cargo',
        ordenar: 'ordenar_por',
        direccion: 'sentido',
        pestana: 'categoria',
        bono100: 'bono_perfecto',
        periodoTipo: 'periodo',
        periodoAnio: 'anio',
        periodoMes: 'mes'
    },
    VALORES: {
        estado: {
            all: 'todos',
            active: 'activos',
            inactive: 'inactivos',
            novelty: 'novedad'
        },
        ordenar: {
            ranking: 'ranking',
            bonos: 'bonos',
            km: 'kilometros',
            eficiencia: 'eficiencia'
        },
        direccion: {
            asc: 'ascendente',
            desc: 'descendente'
        },
        periodoTipo: {
            all: 'todo_el_tiempo',
            year: 'anual',
            month: 'mensual'
        }
    }
} as const;

export class FiltroService {
    /**
     * Obtiene el estado inicial de los filtros desde los parámetros de la URL.
     */
    static obtenerDeUrl(): FiltrosData {
        if (typeof window === 'undefined') return this.obtenerPredeterminados();

        const params = new URLSearchParams(window.location.search);

        const reversarMapeo = (slugKey: keyof typeof SLUGS.VALORES, claveUrl: string, valorPorDefecto: string) => {
            const valorUrl = params.get(claveUrl);
            if (!valorUrl || valorUrl === 'undefined') return valorPorDefecto;

            const mapeo = SLUGS.VALORES[slugKey];
            const claveOriginal = Object.keys(mapeo).find(
                key => (mapeo as any)[key] === valorUrl
            );
            return (claveOriginal as any) || valorPorDefecto;
        };

        const tipoPeriodo = reversarMapeo('periodoTipo', SLUGS.CLAVES.periodoTipo, 'all');

        return {
            busqueda: params.get(SLUGS.CLAVES.busqueda) || '',
            estado: reversarMapeo('estado', SLUGS.CLAVES.estado, 'active') as any,
            cargo: params.get(SLUGS.CLAVES.cargo) || 'all',
            ordenar: reversarMapeo('ordenar', SLUGS.CLAVES.ordenar, 'ranking') as any,
            direccion: reversarMapeo('direccion', SLUGS.CLAVES.direccion, 'asc') as any,
            pestana: params.get(SLUGS.CLAVES.pestana) || 'Todos',
            bono100Rango: params.get(SLUGS.CLAVES.bono100) || null,
            periodo: {
                tipo: tipoPeriodo as any,
                anio: parseInt(params.get(SLUGS.CLAVES.periodoAnio) || '2025'),
                mes: parseInt(params.get(SLUGS.CLAVES.periodoMes) || '-1')
            }
        };
    }

    /**
     * Actualiza la URL para reflejar el estado actual de los filtros.
     */
    static sincronizarUrl(filtros: FiltrosData) {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams();

        if (filtros.busqueda) {
            params.set(SLUGS.CLAVES.busqueda, filtros.busqueda);
        }

        if (filtros.bono100Rango) {
            params.set(SLUGS.CLAVES.bono100, filtros.bono100Rango);
        }

        if (filtros.estado && filtros.estado !== 'active') {
            const val = SLUGS.VALORES.estado[filtros.estado];
            if (val) params.set(SLUGS.CLAVES.estado, val);
        }

        if (filtros.cargo && filtros.cargo !== 'all') {
            params.set(SLUGS.CLAVES.cargo, filtros.cargo);
        }

        if (filtros.ordenar && filtros.ordenar !== 'ranking') {
            const val = SLUGS.VALORES.ordenar[filtros.ordenar];
            if (val) params.set(SLUGS.CLAVES.ordenar, val);
        }

        if (filtros.direccion && filtros.direccion !== 'asc') {
            const val = SLUGS.VALORES.direccion[filtros.direccion];
            if (val) params.set(SLUGS.CLAVES.direccion, val);
        }

        if (filtros.pestana && filtros.pestana !== 'Todos') {
            params.set(SLUGS.CLAVES.pestana, filtros.pestana);
        }

        if (filtros.periodo && filtros.periodo.tipo !== 'all') {
            const val = SLUGS.VALORES.periodoTipo[filtros.periodo.tipo];
            if (val) {
                params.set(SLUGS.CLAVES.periodoTipo, val);
                const anio = filtros.periodo.anio || 2025;
                params.set(SLUGS.CLAVES.periodoAnio, anio.toString());

                if (filtros.periodo.mes !== undefined && filtros.periodo.mes !== null && filtros.periodo.mes !== -1) {
                    params.set(SLUGS.CLAVES.periodoMes, filtros.periodo.mes.toString());
                }
            }
        }

        const query = params.toString();
        const nuevaUrl = query ? `?${query}` : window.location.pathname;

        if (window.location.search !== `?${query}`) {
            window.history.pushState({}, '', nuevaUrl);
        }
    }

    static obtenerPredeterminados(): FiltrosData {
        return {
            busqueda: '',
            estado: 'active',
            cargo: 'all',
            ordenar: 'ranking',
            direccion: 'asc',
            pestana: 'Todos',
            periodo: {
                tipo: 'all',
                anio: 2026,
                mes: -1
            }
        };
    }
}
