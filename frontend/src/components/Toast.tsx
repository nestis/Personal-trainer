import { useEffect, useState } from 'react';

export interface ToastData {
  message: string;
  type: 'success' | 'error';
}

interface Props {
  toast: ToastData | null;
  onDismiss: () => void;
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    maxWidth: 360,
    width: 'calc(100% - 40px)',
  },
  toast: {
    padding: '12px 16px',
    borderRadius: 12,
    background: 'var(--bg-toast)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    fontSize: 15,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
};

function Toast({ toast, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const exitTimer = setTimeout(() => setExiting(true), 2500);
    const dismissTimer = setTimeout(onDismiss, 2800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;

  const borderColor = toast.type === 'success' ? 'var(--green)' : 'var(--red)';
  const icon = toast.type === 'success' ? '\u2713' : '\u2717';

  return (
    <div style={s.wrapper}>
      <div
        style={{
          ...s.toast,
          borderLeft: `3px solid ${borderColor}`,
          animation: exiting ? 'slideDown 0.3s ease-out forwards' : 'slideUp 0.3s ease-out',
        }}
      >
        <span style={{ color: borderColor, fontSize: 18, fontWeight: 700 }}>{icon}</span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export default Toast;
