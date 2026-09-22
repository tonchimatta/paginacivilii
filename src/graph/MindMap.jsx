import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, applyNodeChanges, useReactFlow } from 'reactflow';
import { animate } from 'framer-motion';

import { MapActions } from './actions.js';
import { layoutTree } from './layout.js';
import { boundsOf, interpolateViewport, viewportForBounds } from './camera.js';
import { articles, ancestorsOf, descendantsOf, nodesById, rootId, tintOf } from '../data/unit.js';
import TopicNode from '../nodes/TopicNode.jsx';
import ConceptNode from '../nodes/ConceptNode.jsx';
import ArticleNode from '../nodes/ArticleNode.jsx';
import SpringEdge from '../edges/SpringEdge.jsx';

const nodeTypes = { topic: TopicNode, concept: ConceptNode, article: ArticleNode };
const edgeTypes = { spring: SpringEdge };

const NODE_SPRING = { type: 'spring', stiffness: 120, damping: 17, mass: 1 };
const CAMERA_TWEEN = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };
const EXIT_MS = 260;
const PULSE_MS = 1800;
const EMPTY = Object.freeze([]);

const articleNodeId = (conceptId, key) => `art:${conceptId}:${key}`;

export default function MindMap({ resetRef }) {
  const rf = useReactFlow();
  const wrapperRef = useRef(null);

  // ---- What is open ------------------------------------------------------------------
  const [expanded, setExpanded] = useState(() => new Set([rootId]));
  const [openArticles, setOpenArticles] = useState([]); // [{ id, conceptId, key }]
  const [pulse, setPulse] = useState(null); // { id, stamp }
  const [activeId, setActiveId] = useState(null); // pressed card, takes its header colour

  // Visible tree: everything reachable from the root through expanded topics, plus the
  // ephemeral article nodes hanging off visible concepts. `parentOf` is the layout parent.
  const visible = useMemo(() => {
    const ids = [];
    const parentOf = new Map();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop();
      ids.push(id);
      const node = nodesById.get(id);
      if (node.type === 'topic' && expanded.has(id)) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          parentOf.set(node.children[i], id);
          stack.push(node.children[i]);
        }
      }
    }
    const shown = new Set(ids);
    for (const a of openArticles) {
      if (!shown.has(a.conceptId)) continue;
      ids.push(a.id);
      parentOf.set(a.id, a.conceptId);
    }
    return { ids, parentOf };
  }, [expanded, openArticles]);

  // ---- React Flow nodes (positions are driven by the layout animation) ------------------
  const [nodes, setNodes] = useState([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const sizesRef = useRef(new Map());
  const [sizeVersion, setSizeVersion] = useState(0);
  const exitingRef = useRef(new Map()); // id -> layout parent at the time it left
  const targetsRef = useRef(new Map());
  const nodeAnimRef = useRef(null);

  const openByConcept = useMemo(() => {
    const m = new Map();
    for (const a of openArticles) m.set(a.conceptId, [...(m.get(a.conceptId) ?? []), a.key]);
    return m;
  }, [openArticles]);

  const dataFor = useCallback(
    (id, exiting) => {
      const pulseStamp = pulse?.id === id ? pulse.stamp : null;
      if (id.startsWith('art:')) {
        const key = id.slice(id.lastIndexOf(':') + 1);
        return { article: articles[key], exiting, pulse: pulseStamp, active: activeId === id };
      }
      const node = nodesById.get(id);
      return {
        node,
        tint: tintOf(id),
        active: activeId === id,
        expanded: expanded.has(id),
        exiting,
        pulse: pulseStamp,
        openArticles: openByConcept.get(id) ?? EMPTY,
      };
    },
    [expanded, openByConcept, pulse, activeId],
  );

  // Reconcile the visible set with the rendered nodes: new nodes are born at their
  // parent's position (hidden by React Flow until measured), removed ones fade out first.
  useEffect(() => {
    const wanted = new Set(visible.ids);
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      const next = [];
      for (const n of prev) {
        if (wanted.has(n.id)) {
          exitingRef.current.delete(n.id);
          next.push({ ...n, data: dataFor(n.id, false) });
        } else {
          if (!exitingRef.current.has(n.id)) exitingRef.current.set(n.id, n.parentForExit);
          next.push({ ...n, data: dataFor(n.id, true) });
        }
      }
      for (const id of visible.ids) {
        if (byId.has(id)) continue;
        const parent = byId.get(visible.parentOf.get(id));
        const size = parent && sizesRef.current.get(parent.id);
        const position = parent
          ? { x: parent.position.x + (size?.w ?? 0) * 0.6, y: parent.position.y }
          : { x: 0, y: 0 };
        next.push({
          id,
          type: id.startsWith('art:') ? 'article' : nodesById.get(id).type,
          position,
          data: dataFor(id, false),
          parentForExit: visible.parentOf.get(id),
          draggable: false,
          selectable: false,
        });
      }
      return next;
    });
    // Drop faded-out nodes.
    const t = setTimeout(() => {
      setNodes((prev) => prev.filter((n) => !exitingRef.current.has(n.id)));
      for (const id of [...exitingRef.current.keys()]) {
        exitingRef.current.delete(id);
        sizesRef.current.delete(id);
      }
    }, EXIT_MS + 40);
    return () => clearTimeout(t);
  }, [visible, dataFor]);

  const onNodesChange = useCallback((changes) => {
    let resized = false;
    for (const c of changes) {
      if (c.type === 'dimensions' && c.dimensions) {
        const prev = sizesRef.current.get(c.id);
        const { width: w, height: h } = c.dimensions;
        if (!prev || Math.abs(prev.w - w) > 0.5 || Math.abs(prev.h - h) > 0.5) {
          sizesRef.current.set(c.id, { w, h });
          resized = true;
        }
      }
    }
    setNodes((prev) => applyNodeChanges(changes, prev));
    if (resized) setSizeVersion((v) => v + 1);
  }, []);

  // ---- Camera ------------------------------------------------------------------------
  const historyRef = useRef([]); // viewport stack: pushed on open, popped on close
  const cameraAnimRef = useRef(null);
  const cameraIntentRef = useRef({ type: 'fit', ids: null }); // consumed after next layout

  const stopCamera = useCallback(() => {
    cameraAnimRef.current?.stop();
    cameraAnimRef.current = null;
  }, []);

  const flyTo = useCallback(
    (target) => {
      const el = wrapperRef.current;
      if (!el) return;
      stopCamera();
      const { width, height } = el.getBoundingClientRect();
      const lerp = interpolateViewport(rf.getViewport(), target, width, height);
      cameraAnimRef.current = animate(0, 1, {
        ...CAMERA_TWEEN,
        onUpdate: (p) => rf.setViewport(lerp(p)),
        onComplete: () => (cameraAnimRef.current = null),
      });
    },
    [rf, stopCamera],
  );

  const runCameraIntent = useCallback(
    (intent, targets) => {
      const el = wrapperRef.current;
      if (!intent || !el) return;
      if (intent.type === 'restore') return flyTo(intent.viewport);
      const ids = (intent.ids ?? [...targets.keys()]).filter((id) => targets.has(id));
      if (!ids.length) return;
      const rects = ids.map((id) => ({ ...targets.get(id), ...sizesRef.current.get(id) }));
      const { width, height } = el.getBoundingClientRect();
      const opts = intent.type === 'focus' ? { padding: 0.35, maxZoom: 1.05 } : { padding: 0.12, maxZoom: 1 };
      flyTo(viewportForBounds(boundsOf(rects), width, height, opts));
    },
    [flyTo],
  );

  // ---- Layout: dagre on the visible tree, then spring every node to its slot ----------
  useEffect(() => {
    const ids = visible.ids;
    if (!ids.every((id) => sizesRef.current.has(id))) return; // wait for measurement
    const edges = ids.filter((id) => visible.parentOf.has(id)).map((id) => [visible.parentOf.get(id), id]);
    const targets = layoutTree(ids, edges, sizesRef.current);

    // Leaving nodes slide back into their (new) parent slot while fading.
    for (const [id, parentId] of exitingRef.current) {
      let p = parentId;
      while (p && !targets.has(p)) p = nodesById.get(p)?.parentId;
      if (p) targets.set(id, targets.get(p));
    }

    const unchanged =
      targets.size === targetsRef.current.size &&
      [...targets].every(([id, t]) => {
        const o = targetsRef.current.get(id);
        return o && Math.abs(o.x - t.x) < 0.5 && Math.abs(o.y - t.y) < 0.5;
      });
    targetsRef.current = targets;

    const intent = cameraIntentRef.current;
    cameraIntentRef.current = null;
    runCameraIntent(intent, targets);
    if (unchanged) return;

    const from = new Map(nodesRef.current.map((n) => [n.id, n.position]));
    nodeAnimRef.current?.stop();
    nodeAnimRef.current = animate(0, 1, {
      ...NODE_SPRING,
      onUpdate: (p) =>
        setNodes((prev) =>
          prev.map((n) => {
            const a = from.get(n.id);
            const b = targets.get(n.id);
            if (!a || !b) return n;
            return { ...n, position: { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p } };
          }),
        ),
    });
  }, [visible, sizeVersion, runCameraIntent]);

  useEffect(() => () => nodeAnimRef.current?.stop(), []);

  // ---- Actions -------------------------------------------------------------------------
  const pushViewport = useCallback(() => historyRef.current.push(rf.getViewport()), [rf]);
  const popViewport = useCallback(() => {
    const viewport = historyRef.current.pop();
    return viewport ? { type: 'restore', viewport } : null;
  }, []);

  const actions = useMemo(
    () => ({
      activate(id) {
        setActiveId(id);
      },

      toggleTopic(id) {
        const node = nodesById.get(id);
        if (!node || node.type !== 'topic') return;
        if (expanded.has(id)) {
          const gone = new Set(descendantsOf(id));
          setExpanded((prev) => new Set([...prev].filter((x) => x !== id && !gone.has(x))));
          setOpenArticles((prev) => prev.filter((a) => !gone.has(a.conceptId)));
          cameraIntentRef.current = popViewport() ?? { type: 'focus', ids: [id] };
        } else {
          pushViewport();
          setExpanded((prev) => new Set(prev).add(id));
          cameraIntentRef.current = { type: 'fit', ids: [id, ...node.children] };
        }
      },

      focusNode(targetId) {
        if (!nodesById.has(targetId)) return;
        pushViewport();
        const path = ancestorsOf(targetId);
        setExpanded((prev) => {
          const next = new Set(prev);
          path.forEach((p) => next.add(p));
          return next;
        });
        cameraIntentRef.current = { type: 'focus', ids: [targetId] };
        setPulse({ id: targetId, stamp: Date.now() });
        // Nothing may change in the tree (target already visible): nudge the layout pass.
        setSizeVersion((v) => v + 1);
      },

      toggleArticle(conceptId, key) {
        if (!articles[key]) return;
        const id = articleNodeId(conceptId, key);
        if (openArticles.some((a) => a.id === id)) return actions.closeArticle(id);
        pushViewport();
        setOpenArticles((prev) => [...prev, { id, conceptId, key }]);
        cameraIntentRef.current = { type: 'fit', ids: [conceptId, id] };
      },

      closeArticle(id) {
        setOpenArticles((prev) => prev.filter((a) => a.id !== id));
        cameraIntentRef.current = popViewport();
      },
    }),
    [expanded, openArticles, pushViewport, popViewport],
  );

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(null), PULSE_MS);
    return () => clearTimeout(t);
  }, [pulse]);

  // ---- Edges ---------------------------------------------------------------------------
  const edges = useMemo(
    () =>
      nodes
        .filter((n) => n.parentForExit)
        .map((n) => ({
          id: `e:${n.id}`,
          source: n.parentForExit,
          target: n.id,
          type: 'spring',
          data: { variant: n.type === 'article' ? 'article' : 'tree', exiting: n.data.exiting },
        })),
    // Recomputed only when the set of nodes or their exit state changes, not per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.map((n) => `${n.id}${n.data.exiting ? '-' : '+'}`).join('|')],
  );

  // Manual pan/zoom always wins: any user-initiated move cancels a running camera flight.
  const onMoveStart = useCallback((event) => event && stopCamera(), [stopCamera]);

  const resetView = useCallback(() => {
    historyRef.current = [];
    cameraIntentRef.current = { type: 'fit', ids: null };
    setSizeVersion((v) => v + 1);
  }, []);
  if (resetRef) resetRef.current = resetView;

  return (
    <MapActions.Provider value={actions}>
      <div className="map" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onMoveStart={onMoveStart}
          onPaneClick={() => setActiveId(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          zoomOnDoubleClick={false}
          minZoom={0.08}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background id="minor" variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="var(--grid-minor)" />
          <Background id="major" variant={BackgroundVariant.Lines} gap={120} lineWidth={1} color="var(--grid-major)" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </MapActions.Provider>
  );
}
