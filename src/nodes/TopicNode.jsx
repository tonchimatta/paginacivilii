import { memo } from 'react';
import { motion } from 'framer-motion';
import Card from './Card.jsx';
import { useMapActions } from '../graph/actions.js';

const KIND_LABEL = { unidad: 'Unidad', parte: 'Parte', tema: 'Tema', subtema: 'Subtema' };

function TopicNode({ data }) {
  const { node, expanded, exiting, pulse } = data;
  const actions = useMapActions();
  const count = node.children.length;

  return (
    <Card
      className={`card--topic card--${node.kind}${expanded ? ' is-open' : ''}`}
      exiting={exiting}
      pulse={pulse}
      onClick={() => actions.toggleTopic(node.id)}
    >
      <div className="topic">
        <div className="topic__meta">
          <span className="topic__kind">{KIND_LABEL[node.kind] ?? 'Tema'}</span>
          {node.number ? <span className="topic__number">{node.number}</span> : null}
          {node.pending ? <span className="tag tag--pending">Pendiente</span> : null}
        </div>
        <div className="topic__title" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        <div className="topic__foot">
          <span className="topic__count">
            {count} {count === 1 ? 'rama' : 'ramas'}
          </span>
          <motion.span
            className="topic__chevron"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" width="14" height="14">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        </div>
      </div>
    </Card>
  );
}

export default memo(TopicNode);
