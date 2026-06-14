import { useState } from 'react';

interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
  label: string;
  hotkey?: string;
  count?: number;
}

export default function ToggleSwitch({ active, onToggle, label, hotkey, count }: ToggleSwitchProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        padding: '2px 6px',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.12s ease',
        userSelect: 'none',
        outline: 'none',
        minHeight: 18,
      }}
    >
      {/* Indicator dot */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: active ? '#FFFFFF' : '#3A3A3A',
          lineHeight: 1,
          transition: 'color 0.15s ease',
          flexShrink: 0,
        }}
      >
        {active ? '●' : '○'}
      </span>

      {/* Label */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: active ? '#D0D0D0' : '#505050',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          flex: 1,
          transition: 'color 0.15s ease',
        }}
      >
        {label}
      </span>

      {/* Count */}
      {count !== undefined && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#505050',
            marginRight: 4,
          }}
        >
          {count.toLocaleString('en-US')}
        </span>
      )}

      {/* Hotkey badge */}
      {hotkey && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: '#3A3A3A',
            border: '1px solid #2A2A2A',
            padding: '0 3px',
            lineHeight: '14px',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {hotkey}
        </span>
      )}
    </div>
  );
}
