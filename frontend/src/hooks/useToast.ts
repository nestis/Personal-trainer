import { useState, useCallback } from 'react';
import { ToastData } from '../components/Toast';

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
