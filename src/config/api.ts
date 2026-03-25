export const API_CONFIG = {
    BASE_URL: 'https://indicador-desempeno.sao6.com.co/api',
    ENDPOINTS: {
        LOGIN: '/autenticacion/login',
        OPERADORES: {
            GET_ALL: '/autenticacion/operadores',
        },
        DESEMPENO: {
            GET_METRICS: '/desempeno', // :codigo?anio=2025
            GET_YEARS: '/desempeno', // :codigo/anios
            GET_RANKING: '/desempeno/ranking',
        },
        MANTENIMIENTO: {
            GET_RANKING: '/mantenimiento/ranking',
        }
    }
};

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`;
