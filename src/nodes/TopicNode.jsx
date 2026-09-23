import { memo } from 'react';
import Card from './Card.jsx';
import Body from './Body.jsx';
import Chevron from './Chevron.jsx';
import { useMapActions } from '../graph/actions.js';

const KIND_LABEL = { unidad: 'Apuntes', parte: 'Parte', tema: 'Tema', subtema: 'Subtema' };
const MENU_KINDS = new Set(['parte', 'tema']);

// Every heading of the notes (unidad, parte, tema, subtema) uses this card, with or without
// a definition: pastel header with its number, title, definition, branch count.
function TopicNode({ id, data }) {
  const { node, expanded, exiting, pulse, tint, active, openArticles } = data;
  const actions = useMapActions();
  const count = node.children.length;

  return (
    <Card
      id={id}
      className={`card--topic card--${node.kind}${node.body ? ' has-body' : ''}${expanded ? ' is-open' : ''}${count ? ' is-expandable' : ''}`}
      tint={tint}
      active={active}
      exiting={exiting}
      pulse={pulse}
      onClick={count ? () => actions.toggleTopic(node.id) : undefined}
      // Partes and temas can be opened on their own tab (long press / right click).
      onLongPress={MENU_KINDS.has(node.kind) && count ? (x, y) => actions.openMenu(node.id, x, y) : undefined}
    >
      <div className="topic">
        <div className="topic__thumb">
          <span className="topic__kind">{KIND_LABEL[node.kind] ?? 'Tema'}</span>
          <span className="topic__numeral">{node.number ?? ''}</span>
        </div>
        <div className="topic__title title-font" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        {node.body ? <Body html={node.body} nodeId={node.id} openArticles={openArticles} /> : null}
        {node.pending && !node.body ? <div className="card__body card__body--empty">Sección pendiente en las notas.</div> : null}
        {count ? (
          <div className="card__foot">
            <span>
              {count} {count === 1 ? 'rama' : 'ramas'}
            </span>
            <Chevron open={expanded} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default memo(TopicNode);
