import { memo, useEffect, useRef } from 'react';
import { useMapActions } from '../graph/actions.js';

// The body HTML is produced at build time (scripts/lib/parse-notes.mjs). Links inside it
// carry data-art (article citation) or data-target (cross-reference to another node).
// Cards never scroll internally: on a touch screen a drag inside a card would fight the
// canvas pan, so each card shows its whole text and the layout makes room for it.
function Body({ html, nodeId, openArticles }) {
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
    if (link.dataset.art) actions.toggleArticle(nodeId, link.dataset.art);
    else if (link.dataset.target) actions.focusNode(link.dataset.target);
  };

  return <div ref={ref} className="card__body prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default memo(Body);
