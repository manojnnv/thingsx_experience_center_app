import { configureStore } from '@reduxjs/toolkit';
import orgDetailsReducer from './features/orgDetails/orgDetailsSlice';

export const store = configureStore({
  reducer: {
    orgDetails: orgDetailsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
