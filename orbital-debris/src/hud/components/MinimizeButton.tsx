// Small +/− control that collapses a HUD panel down to its title bar.
export default function MinimizeButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      title={collapsed ? 'Expand' : 'Minimize'}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        color: '#808080',
        cursor: 'pointer',
        lineHeight: 1,
        padding: '0 2px 0 8px',
        userSelect: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#808080')}
    >
      {collapsed ? '＋' : '－'}
    </span>
  );
}
