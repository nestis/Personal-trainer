interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 900,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 34,
    padding: '22px 18px 18px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 6,
  },
  message: {
    fontSize: 15,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginBottom: 20,
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
};

function ConfirmDialog({ title, message, confirmLabel = 'Delete', destructive = true, onConfirm, onCancel }: Props) {
  return (
    <div style={s.backdrop} onClick={onCancel}>
      <div className="glass glass-strong glass-pop" role="alertdialog" aria-label={title} style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={s.title}>{title}</div>
        <div style={s.message}>{message}</div>
        <div style={s.actions}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className={`btn ${destructive ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={onConfirm} style={{ flex: 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
