import { configureStore } from '@reduxjs/toolkit';
// Import your reducers here
// import counterReducer from '../features/counter';

export const store = configureStore({
  reducer: {
    // Add your reducers here
    // counter: counterReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
