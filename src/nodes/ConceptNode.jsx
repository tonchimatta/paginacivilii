import { memo, useEffect, useRef, useState } from 'react';
import Card from './Card.jsx';
import { useMapActions } from '../graph/actions.js';

// The body HTML is produced at build time (scripts/lib/parse-notes.mjs). Links inside it
// carry data-art (article citation) or data-target (cross-reference to another node).
const Body = memo(function Body({ html, conceptId, openArticles }) {
  const actions = useMapActions();
  const ref = useRef(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

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

  return (
    <div
      ref={ref}
      // Only swallow the wheel when there is something to scroll; otherwise it zooms the map.
      className={`concept__body prose nodrag${scrolls ? ' nowheel is-scrollable' : ''}`}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

function ConceptNode({ data }) {
  const { node, exiting, pulse, openArticles } = data;

  return (
    <Card className={`card--concept${node.intro ? ' card--intro' : ''}`} exiting={exiting} pulse={pulse}>
      <div className="concept">
        <div className="concept__head">
          <span className="badge-d" title="Definición">D</span>
          <div className="concept__title" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        </div>
        {node.intro ? <div className="concept__kicker">Panorama del tema</div> : null}
        {node.body ? (
          <Body html={node.body} conceptId={node.id} openArticles={openArticles} />
        ) : (
          <div className="concept__body concept__body--empty">Sección pendiente en las notas.</div>
        )}
      </div>
    </Card>
  );
}

export default memo(ConceptNode);
