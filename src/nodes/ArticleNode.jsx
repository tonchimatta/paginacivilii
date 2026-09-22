import { memo } from 'react';
import Card from './Card.jsx';
import { useMapActions } from '../graph/actions.js';

function ArticleNode({ id, data }) {
  const { article, exiting, pulse, active } = data;
  const actions = useMapActions();

  return (
    <Card id={id} className="card--article" tint="yellow" active={active} exiting={exiting} pulse={pulse}>
      <div className="article">
        <div className="article__head">
          <span className="article__code">Código Civil</span>
          <button
            type="button"
            className="article__close nodrag"
            aria-label="Cerrar artículo"
            onClick={(e) => {
              e.stopPropagation();
              actions.closeArticle(id);
            }}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="article__title title-font">Art. {article.number}</div>
        {article.context ? <div className="article__context">{article.context}</div> : null}
        <div className="article__body prose nodrag nowheel">
          {article.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default memo(ArticleNode);
