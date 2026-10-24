import { useLayoutEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minRows?: number;
  maxLength?: number;
  label: string;
  readOnly?: boolean;
}

/**
 * A text area that grows with its content, so long notes are always fully
 * visible and the page scrolls instead of the field.
 */
function AutoTextarea({ value, onChange, onBlur, placeholder, minRows = 4, maxLength, label, readOnly }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const nearLimit = maxLength !== undefined && value.length > maxLength * 0.9;

  return (
    <div>
      <textarea
        ref={ref}
        className="input"
        style={{ resize: 'none', overflow: 'hidden', display: 'block', lineHeight: 1.45 }}
        aria-label={label}
        value={value}
        rows={minRows}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {nearLimit && (
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

export default AutoTextarea;
