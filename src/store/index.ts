import { configureStore } from '@reduxjs/toolkit';
import desempenoReducer from './slices/desempenoSlice';

export const store = configureStore({
    reducer: {
        desempeno: desempenoReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
