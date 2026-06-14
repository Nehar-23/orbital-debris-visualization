import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '../../store/useDataStore';

const mono = "'JetBrains Mono', monospace";
const inter = "'Inter', sans-serif";

export default function LoadingScreen({ onRetry }: { onRetry?: () => void }) {
  const isLoaded = useDataStore((s) => s.isLoaded);
  const progress = useDataStore((s) => s.loadingProgress);
  const message = useDataStore((s) => s.loadingMessage);
  const error = useDataStore((s) => s.loadError);

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      const t = setTimeout(() => setVisible(false), 700);
      return () => clearTimeout(t);
    }
  }, [isLoaded]);

  const pct = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            pointerEvents: isLoaded ? 'none' : 'auto',
          }}
        >
          {/* Subtle background grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          <div style={{ position: 'relative', width: 460, padding: '48px 40px' }}>
            {/* Corner brackets */}
            {[
              { top: 0, left: 0, bw: '1px 0 0 1px' },
              { top: 0, right: 0, bw: '1px 1px 0 0' },
              { bottom: 0, left: 0, bw: '0 0 1px 1px' },
              { bottom: 0, right: 0, bw: '0 1px 1px 0' },
            ].map((c, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  width: 16, height: 16,
                  borderColor: 'rgba(255,255,255,0.4)',
                  borderStyle: 'solid',
                  borderWidth: c.bw,
                  top: c.top, left: c.left, right: c.right, bottom: c.bottom,
                }}
              />
            ))}

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 30,
                  fontWeight: 300,
                  letterSpacing: '0.3em',
                  color: '#FFFFFF',
                  paddingLeft: '0.3em',
                }}
              >
                ORBITAL DEBRIS
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 30,
                  fontWeight: 300,
                  letterSpacing: '0.3em',
                  color: '#FFFFFF',
                  paddingLeft: '0.3em',
                  marginTop: 2,
                }}
              >
                FIELD
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: '0.28em',
                color: '#505050',
                marginBottom: 36,
                textTransform: 'uppercase',
              }}
            >
              Real-Time Tracking System
            </div>

            {error ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: '#C8C8C8', marginBottom: 16, letterSpacing: '0.05em' }}>
                  ◇ CATALOG FETCH FAILED
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: '#707070', marginBottom: 20 }}>{error}</div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      color: '#FFFFFF',
                      background: 'transparent',
                      border: '1px solid #2A2A2A',
                      padding: '8px 20px',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div style={{ position: 'relative', height: 2, background: '#1A1A1A', overflow: 'hidden', marginBottom: 14 }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#FFFFFF' }}
                  />
                  {/* Scanning line */}
                  <motion.div
                    animate={{ x: ['-20%', '120%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      width: '20%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                    }}
                  />
                </div>

                {/* Status row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#909090', letterSpacing: '0.04em' }}>{message}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: '#D0D0D0' }}>{pct}%</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
