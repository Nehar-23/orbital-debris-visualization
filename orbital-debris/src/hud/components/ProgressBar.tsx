interface ProgressBarProps {
  value: number; // 0-1
  label?: string;
  count?: number;
  color?: string;
}

export default function ProgressBar({ value, label, count, color = '#FFFFFF' }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;

  return (
    <div style={{ width: '100%' }}>
      {(label !== undefined || count !== undefined) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          {label !== undefined && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: '#909090',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
          )}
          {count !== undefined && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: '#D0D0D0',
                letterSpacing: '0.04em',
              }}
            >
              {count.toLocaleString('en-US')}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: 2,
          background: '#1A1A1A',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: color,
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
