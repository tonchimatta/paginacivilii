import avanzarLogo from './assets/avanzar-uc-logo.png';

const ARROW_PATH = 'M3 8h9.5M8.5 4l4 4-4 4';

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
      <path d={ARROW_PATH} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.6" cy="4.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

const LINKS = [
  {
    tag: 'conoce más',
    href: 'https://www.instagram.com/avanzaruc',
    label: '@avanzaruc',
  },
  {
    tag: '¿te interesa conocer AVZ?',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSf1YnirgALMK80H0_aFpfaoNCIvOxEmm0GCe7PlCcmgWdRr4g/viewform?pli=1',
    label: 'Postula acá',
  },
  {
    tag: 'consejería de derecho',
    href: 'https://www.instagram.com/simon.ct.derecho',
    label: '@simon.ct.derecho',
  },
];

// Footer of the landing page: what the site is (Avanzar UC project), where to follow it and
// how to get involved, closed by the Avanzar UC wordmark, big and white, over the site's own
// ink so it reads the same way it does on the brand's own dark surfaces.
export default function Footer() {
  return (
    <footer className="site-footer">
      <p className="site-footer__lede">Proyecto de Avanzar UC, Consejería territorial 2025-2026</p>

      <div className="site-footer__grid">
        {LINKS.map((l) => (
          <div className="site-footer__block" key={l.href}>
            <span className="site-footer__tag">{l.tag}</span>
            <a className="site-footer__link" href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
              <Arrow />
            </a>
          </div>
        ))}
      </div>

      <div className="site-footer__wordmark">
        <img src={avanzarLogo} alt="Avanzar UC" />
      </div>

      <div className="site-footer__bottom">
        <span>Personas y Bienes · Mapas de apuntes</span>
        <a
          className="site-footer__ig"
          href="https://www.instagram.com/simon.ct.derecho"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram de la consejería de Derecho"
        >
          <InstagramIcon />
        </a>
      </div>
    </footer>
  );
}
