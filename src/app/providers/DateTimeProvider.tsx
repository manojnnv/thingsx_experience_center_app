"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DateTimeContextType {
  currentDateTime: Date;
  setCurrentDateTime: (date: Date) => void;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
}

const DateTimeContext = createContext<DateTimeContextType | undefined>(undefined);

interface DateTimeProviderProps {
  children: ReactNode;
}

export function DateTimeProvider({ children }: DateTimeProviderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <DateTimeContext.Provider
      value={{
        currentDateTime,
        setCurrentDateTime,
        formatDate,
        formatTime,
      }}
    >
      {children}
    </DateTimeContext.Provider>
  );
}

export function useDateTime() {
  const context = useContext(DateTimeContext);
  if (context === undefined) {
    throw new Error('useDateTime must be used within a DateTimeProvider');
  }
  return context;
}
