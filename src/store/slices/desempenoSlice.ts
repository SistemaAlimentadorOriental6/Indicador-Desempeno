import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_CONFIG } from '../../config/api';

interface DesempenoState {
    operatorCode: string | null;
    selectedYear: number;
    availableYears: number[];
    performanceData: any | null;
    historicalData: Record<number, any>; // Mapa de año -> datos de desempeño
    loading: boolean;
    error: string | null;
}

const initialState: DesempenoState = {
    operatorCode: null,
    selectedYear: new Date().getFullYear(),
    availableYears: [],
    performanceData: null,
    historicalData: {},
    loading: false,
    error: null,
};

// Async Thunks
export const fetchPerformanceData = createAsyncThunk(
    'desempeno/fetchData',
    async ({ codigo, anio }: { codigo: string; anio: number }) => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DESEMPENO.GET_METRICS}/${codigo}?anio=${anio}`);
        if (!response.ok) throw new Error('Error al cargar datos de desempeño');
        return await response.json();
    }
);

export const fetchAvailableYears = createAsyncThunk(
    'desempeno/fetchYears',
    async (codigo: string) => {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DESEMPENO.GET_YEARS}/${codigo}/anios`);
        if (!response.ok) throw new Error('Error al cargar años disponibles');
        return await response.json();
    }
);

export const fetchHistoricalData = createAsyncThunk(
    'desempeno/fetchHistorical',
    async ({ codigo, anios }: { codigo: string; anios: number[] }, { dispatch }) => {
        const promises = anios.map(anio =>
            fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DESEMPENO.GET_METRICS}/${codigo}?anio=${anio}`)
                .then(res => res.json())
                .then(data => ({ anio, data }))
        );
        return await Promise.all(promises);
    }
);

const desempenoSlice = createSlice({
    name: 'desempeno',
    initialState,
    reducers: {
        setOperatorCode: (state, action) => {
            state.operatorCode = action.payload;
        },
        setSelectedYear: (state, action) => {
            state.selectedYear = action.payload;
        },
        clearDesempenoData: (state) => {
            state.performanceData = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Performance Data
            .addCase(fetchPerformanceData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPerformanceData.fulfilled, (state, action) => {
                state.loading = false;
                state.performanceData = action.payload;
                const year = action.meta.arg.anio;
                state.historicalData[year] = action.payload;
            })
            .addCase(fetchPerformanceData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Error desconocido';
            })
            // Available Years
            .addCase(fetchAvailableYears.fulfilled, (state, action) => {
                const raw = action.payload;
                if (Array.isArray(raw)) {
                    state.availableYears = raw.map((y: any) =>
                        typeof y === "object" ? y.anio || y.year || y.ANIO : y,
                    ).filter(y => y != null && !isNaN(y));
                }
            })
            // Historical Data
            .addCase(fetchHistoricalData.fulfilled, (state, action) => {
                action.payload.forEach(({ anio, data }) => {
                    state.historicalData[anio] = data;
                });
            });
    },
});

export const { setOperatorCode, setSelectedYear, clearDesempenoData } = desempenoSlice.actions;
export default desempenoSlice.reducer;
