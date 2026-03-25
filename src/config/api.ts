export const API_CONFIG = {
    BASE_URL: 'https://indicador-desempeno.sao6.com.co/api/api',
    //BASE_URL: 'http://localhost:3040/api',
    ENDPOINTS: {
        LOGIN: '/autenticacion/login',
        OPERADORES: {
            GET_ALL: '/autenticacion/operadores',
        },
        DESEMPENO: {
            GET_METRICS: '/desempeno', // :codigo?anio=2025
            GET_YEARS: '/desempeno', // :codigo/anios
            GET_RANKING: '/desempeno/ranking',
            GET_PERIODOS: '/desempeno/periodos',
        },
        MANTENIMIENTO: {
            GET_RANKING: '/mantenimiento/ranking',
        }
    }
};

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`;
