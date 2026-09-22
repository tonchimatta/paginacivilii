import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Card from './Card.jsx';
import { useMapActions } from '../graph/actions.js';

const KIND_LABEL = { parte: 'Parte', tema: 'Tema', subtema: 'Subtema', caso: 'Caso' };

// The body HTML is produced at build time (scripts/lib/parse-notes.mjs). Links inside it
// carry data-art (article citation) or data-target (cross-reference to another node).
// Cards never scroll internally: on a touch screen a drag inside a card would fight the
// canvas pan, so each card shows its whole text and the layout makes room for it.
const Body = memo(function Body({ html, conceptId, openArticles }) {
  const actions = useMapActions();
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.querySelectorAll('a.ref-art').forEach((a) => {
      a.classList.toggle('is-open', openArticles.includes(a.dataset.art));
    });
  }, [openArticles, html]);

  const onClick = (e) => {
    const link = e.target.closest('a.ref');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    if (link.dataset.art) actions.toggleArticle(conceptId, link.dataset.art);
    else if (link.dataset.target) actions.focusNode(link.dataset.target);
  };

  return <div ref={ref} className="concept__body prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
});

function ConceptNode({ id, data }) {
  const { node, expanded, exiting, pulse, openArticles, tint, active } = data;
  const actions = useMapActions();
  const count = node.children.length;
  const kicker = KIND_LABEL[node.kind];
  const toggle = count ? () => actions.toggleTopic(node.id) : undefined;

  return (
    <Card
      id={id}
      className={`card--concept card--${node.kind}${count ? ' is-expandable' : ''}${expanded ? ' is-open' : ''}`}
      tint={tint}
      active={active}
      exiting={exiting}
      pulse={pulse}
    >
      <div className="concept">
        {kicker && node.origin !== 'item' ? (
          <div className="concept__kicker">
            {kicker}
            {node.number ? <span className="concept__number">{node.number}</span> : null}
          </div>
        ) : null}
        <div className="concept__head" onClick={toggle}>
          <span className="badge-d" title="Definición">
            D
          </span>
          <div className="concept__title title-font" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        </div>
        {node.body ? (
          <Body html={node.body} conceptId={node.id} openArticles={openArticles} />
        ) : (
          <div className="concept__body concept__body--empty">Sección pendiente en las notas.</div>
        )}
        {count ? (
          <button type="button" className="concept__foot" onClick={toggle}>
            <span>
              {count} {count === 1 ? 'rama' : 'ramas'}
            </span>
            <motion.span
              className="topic__chevron"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              aria-hidden
            >
              <svg viewBox="0 0 16 16" width="12" height="12">
                <path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.span>
          </button>
        ) : null}
      </div>
    </Card>
  );
}

export default memo(ConceptNode);
