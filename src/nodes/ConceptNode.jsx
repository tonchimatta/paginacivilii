import { memo } from 'react';
import Card from './Card.jsx';
import Body from './Body.jsx';
import Chevron from './Chevron.jsx';
import { useMapActions } from '../graph/actions.js';

// Everything that hangs from a heading (a labelled block, a list item, a court case) uses
// this card: "D" badge, term, text, and its own branches if it has any.
function ConceptNode({ id, data }) {
  const { node, expanded, exiting, pulse, openArticles, tint, active } = data;
  const actions = useMapActions();
  const count = node.children.length;
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
        {node.kind === 'caso' ? <div className="concept__kicker">Caso</div> : null}
        <div className="concept__head" onClick={toggle}>
          <span className="badge-d" title="Definición">
            D
          </span>
          <div className="concept__title title-font" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        </div>
        {node.body ? <Body html={node.body} nodeId={node.id} openArticles={openArticles} /> : null}
        {count ? (
          <button type="button" className="card__foot card__foot--button" onClick={toggle}>
            <span>
              {count} {count === 1 ? 'rama' : 'ramas'}
            </span>
            <Chevron open={expanded} />
          </button>
        ) : null}
      </div>
    </Card>
  );
}

export default memo(ConceptNode);
