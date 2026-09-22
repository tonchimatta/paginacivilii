import { memo } from 'react';
import { motion } from 'framer-motion';
import Card from './Card.jsx';
import { useMapActions } from '../graph/actions.js';

const KIND_LABEL = { unidad: 'Unidad', parte: 'Parte', tema: 'Tema', subtema: 'Subtema', apartado: 'Apartado', caso: 'Caso' };

function TopicNode({ id, data }) {
  const { node, expanded, exiting, pulse, tint, active } = data;
  const actions = useMapActions();
  const count = node.children.length;

  return (
    <Card
      id={id}
      className={`card--topic card--${node.kind}${expanded ? ' is-open' : ''}`}
      tint={tint}
      active={active}
      exiting={exiting}
      pulse={pulse}
      onClick={() => actions.toggleTopic(node.id)}
    >
      <div className="topic">
        <div className="topic__thumb">
          <span className="topic__kind">{KIND_LABEL[node.kind] ?? 'Tema'}</span>
          <span className="topic__numeral">{node.number ?? ''}</span>
        </div>
        <div className="topic__title title-font" dangerouslySetInnerHTML={{ __html: node.titleHtml }} />
        <div className="topic__foot">
          <span className="topic__count">
            {count} {count === 1 ? 'rama' : 'ramas'}
            {node.pending ? <span className="tag">Pendiente</span> : null}
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
        </div>
      </div>
    </Card>
  );
}

export default memo(TopicNode);
