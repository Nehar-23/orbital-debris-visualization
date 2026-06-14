import React from 'react';

interface CornerframeProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}

const BRACKET_SIZE = 10;
const BORDER_COLOR = 'rgba(255,255,255,0.35)';

export default function Cornerframe({ children, className = '', title }: CornerframeProps) {
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: BORDER_COLOR,
    borderStyle: 'solid',
  };

  return (
    <div
      className={className}
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
    >
      {/* Top-left bracket */}
      <span
        style={{
          ...cornerStyle,
          top: 0,
          left: 0,
          borderWidth: '1px 0 0 1px',
        }}
        aria-hidden="true"
      />

      {/* Top-right bracket */}
      <span
        style={{
          ...cornerStyle,
          top: 0,
          right: 0,
          borderWidth: '1px 1px 0 0',
        }}
        aria-hidden="true"
      />

      {/* Bottom-left bracket */}
      <span
        style={{
          ...cornerStyle,
          bottom: 0,
          left: 0,
          borderWidth: '0 0 1px 1px',
        }}
        aria-hidden="true"
      />

      {/* Bottom-right bracket */}
      <span
        style={{
          ...cornerStyle,
          bottom: 0,
          right: 0,
          borderWidth: '0 1px 1px 0',
        }}
        aria-hidden="true"
      />

      {/* Optional title label — sits inside top-left corner area */}
      {title && (
        <div
          style={{
            position: 'absolute',
            top: -9,
            left: 14,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 400,
            letterSpacing: '0.12em',
            color: '#505050',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            background: 'transparent',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {title}
        </div>
      )}

      {children}
    </div>
  );
}
