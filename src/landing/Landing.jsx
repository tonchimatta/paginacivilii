import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { COURSE, PROFESSORS } from '../data/professors.js';
import Footer from './Footer.jsx';

const SWIPE_PX = 50;

// Circular offset of card i from the centred card, in (-n/2, n/2].
function offsetOf(i, index, n) {
  let d = (i - index) % n;
  if (d > n / 2) d -= n;
  if (d <= -n / 2) d += n;
  return d;
}

// Home page: the course title and a carousel of professors' notes. The centred card is in
// front, its neighbours peek from behind; ← / → (buttons, keyboard or a swipe) rotate it.
export default function Landing() {
  const n = PROFESSORS.length;
  const [index, setIndex] = useState(0);
  const go = useCallback((step) => setIndex((i) => (i + step + n) % n), [n]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <main className="landing">
      <header className="landing__head">
        <h1 className="landing__title">{COURSE}</h1>
      </header>

      <motion.section
        className="carousel"
        aria-roledescription="carrusel"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_PX) go(1);
          else if (info.offset.x > SWIPE_PX) go(-1);
        }}
      >
        {PROFESSORS.map((p, i) => {
          const d = offsetOf(i, index, n);
          const hidden = Math.abs(d) > 2;
          return (
            <motion.article
              key={p.id}
              className={`pcard tint-${p.theme}${d === 0 ? ' is-current' : ''}`}
              aria-hidden={d !== 0}
              initial={false}
              animate={{
                x: `${d * 58}%`,
                scale: 1 - Math.abs(d) * 0.1,
                rotate: d * 2.5,
                opacity: hidden ? 0 : 1,
                zIndex: 10 - Math.abs(d),
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{ pointerEvents: hidden ? 'none' : 'auto' }}
              onClick={() => {
                if (d !== 0) setIndex(i);
                else if (p.route) window.location.hash = p.route;
              }}
            >
              {/* One line per name, breaking before "y": "Gandarillas / y Vergara". */}
              <h2 className="pcard__name">
                {p.name.split(/ (?=y )/).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              {/* Placeholder until the portrait illustrations are added. */}
              <div className="pcard__figure" aria-label="Imagen pendiente">
                <span>!</span>
              </div>
              <div className="pcard__foot">
                <span className="pcard__dots" aria-hidden>
                  {PROFESSORS.map((q, k) => (
                    <i key={q.id} className={k === i ? 'is-on' : ''} />
                  ))}
                </span>
                {p.route ? (
                  <a className="pcard__cta" href={p.route} tabIndex={d === 0 ? 0 : -1} onClick={(e) => e.stopPropagation()}>
                    Ver apuntes
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                      <path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ) : (
                  <span className="pcard__soon">Próximamente</span>
                )}
              </div>
            </motion.article>
          );
        })}
      </motion.section>

      <div className="carousel__controls">
        <button type="button" className="carousel__btn" onClick={() => go(-1)} aria-label="Profesor anterior">
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
            <path d="M13 8H3.5M7.5 4 3.5 8l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="carousel__label" aria-live="polite">
          {PROFESSORS[index].name}
        </span>
        <button type="button" className="carousel__btn" onClick={() => go(1)} aria-label="Profesor siguiente">
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
            <path d="M3 8h9.5M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <Footer />
    </main>
  );
}
