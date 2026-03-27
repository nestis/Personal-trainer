interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 900,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius)',
    padding: 24,
    animation: 'scaleIn 0.2s ease-out',
    boxShadow: 'var(--shadow-elevated)',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginBottom: 24,
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
};

function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  return (
    <div style={s.backdrop} onClick={onCancel}>
      <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={s.title}>{title}</div>
        <div style={s.message}>{message}</div>
        <div style={s.actions}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} style={{ flex: 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
