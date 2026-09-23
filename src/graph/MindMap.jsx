import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, applyNodeChanges, useReactFlow } from 'reactflow';
import { animate } from 'framer-motion';

import { MapActions } from './actions.js';
import { layoutTree } from './layout.js';
import { nextOf, prevOf } from './navigation.js';
import NavButtons from './NavButtons.jsx';
import { boundsOf, interpolateViewport, viewportForBounds } from './camera.js';
import { articles, ancestorsOf, descendantsOf, nodesById, rootId as unitRootId, tintOf } from '../data/unit.js';
import TopicNode from '../nodes/TopicNode.jsx';
import ConceptNode from '../nodes/ConceptNode.jsx';
import ArticleNode from '../nodes/ArticleNode.jsx';
import SpringEdge from '../edges/SpringEdge.jsx';

const nodeTypes = { topic: TopicNode, concept: ConceptNode, article: ArticleNode };
const edgeTypes = { spring: SpringEdge };

const NODE_SPRING = { type: 'spring', stiffness: 210, damping: 26, mass: 1, restDelta: 0.001 };
const CAMERA_TWEEN = { duration: 0.6, ease: [0.22, 1, 0.36, 1] };
const EXIT_MS = 260;
const PULSE_MS = 1800;
const EMPTY = Object.freeze([]);

const articleNodeId = (conceptId, key) => `art:${conceptId}:${key}`;

// `rootId` is the unit root on the home tab, or a parte/tema on a tab opened for that branch:
// the map then shows only that node and what hangs from it.
export default function MindMap({ rootId = unitRootId, active = true, controlsRef, onOpenMenu, onOutside }) {
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
      if (node.children.length && expanded.has(id)) {
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
  }, [expanded, openArticles, rootId]);

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
        // The measured size is kept on purpose: if the node comes back and React reuses its
        // DOM element, React Flow will not report its size again, and the layout would wait
        // for it forever (children left piled up where they were born).
        exitingRef.current.delete(id);
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
  const lastToggleRef = useRef(null);
  const cameraAnimRef = useRef(null);
  const flightStartRef = useRef(0);
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
      flightStartRef.current = performance.now();
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
      const opts =
        intent.type === 'frame'
          ? { padding: 0.06, maxZoom: 1.8 }
          : intent.type === 'nav'
            ? { padding: 0.22, maxZoom: 1.1 }
          : intent.type === 'focus'
            ? { padding: 0.35, maxZoom: 1.05 }
            : { padding: 0.12, maxZoom: 1 };
      flyTo(viewportForBounds(boundsOf(rects), width, height, opts));
    },
    [flyTo],
  );

  // ---- Layout: dagre on the visible tree, then spring every node to its slot ----------
  useEffect(() => {
    const ids = visible.ids;
    for (const id of ids) {
      if (sizesRef.current.has(id)) continue;
      const n = rf.getNode(id);
      if (n?.width && n?.height) sizesRef.current.set(id, { w: n.width, h: n.height });
    }
    if (!ids.every((id) => sizesRef.current.has(id))) return; // wait for measurement
    const edges = ids.filter((id) => visible.parentOf.has(id)).map((id) => [visible.parentOf.get(id), id]);
    const targets = layoutTree(ids, edges, sizesRef.current);

    // Leaving nodes slide back into their (new) parent slot while fading.
    for (const [id, parentId] of exitingRef.current) {
      let p = parentId;
      while (p && !targets.has(p)) p = nodesById.get(p)?.parentId;
      if (p) targets.set(id, targets.get(p));
    }

    // Skip the animation only if nothing has to move: either the same layout is already
    // being animated, or every node already sits on its slot. Comparing with the actual
    // positions (not just the previous layout) re-moves a node left short of its slot.
    const sameLayout =
      targets.size === targetsRef.current.size &&
      [...targets].every(([id, t]) => {
        const o = targetsRef.current.get(id);
        return o && Math.abs(o.x - t.x) < 0.5 && Math.abs(o.y - t.y) < 0.5;
      });
    const inPlace = nodesRef.current.every((n) => {
      const t = targets.get(n.id);
      return !t || (Math.abs(n.position.x - t.x) < 0.5 && Math.abs(n.position.y - t.y) < 0.5);
    });
    const unchanged = inPlace || (sameLayout && nodeAnimRef.current !== null);
    targetsRef.current = targets;

    const intent = cameraIntentRef.current;
    cameraIntentRef.current = null;
    runCameraIntent(intent, targets);
    if (unchanged) return;

    const from = new Map(nodesRef.current.map((n) => [n.id, n.position]));
    nodeAnimRef.current?.stop();
    nodeAnimRef.current = animate(0, 1, {
      ...NODE_SPRING,
      onComplete: () => {
        nodeAnimRef.current = null;
        // Land exactly on the slots, whatever frames were skipped.
        setNodes((prev) => prev.map((n) => (targets.has(n.id) ? { ...n, position: targets.get(n.id) } : n)));
      },
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
  }, [visible, sizeVersion, runCameraIntent, rf]);

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

      // ← / → buttons: move the current card, opening what is needed to show it and
      // folding the branch just finished when the step climbs to the next subtema/tema/parte.
      navigate(step) {
        if (!step) return;
        const { target, finished } = step;
        const ancestors = ancestorsOf(target);
        const path = target === rootId ? [] : ancestors.slice(0, ancestors.indexOf(rootId) + 1);
        const gone = finished ? new Set([finished, ...descendantsOf(finished)]) : null;
        setExpanded((prev) => {
          const next = new Set(prev);
          if (gone) gone.forEach((g) => next.delete(g));
          path.forEach((p) => next.add(p));
          // Arriving at a card that has branches opens it, so what comes next is in view.
          if (nodesById.get(target).children.length) next.add(target);
          return next;
        });
        if (gone) setOpenArticles((prev) => prev.filter((a) => !gone.has(a.conceptId)));
        setActiveId(target);
        cameraIntentRef.current = { type: 'nav', ids: [target] };
        setSizeVersion((v) => v + 1);
      },

      openMenu(id, x, y) {
        onOpenMenu?.(id, x, y);
      },

      // Double tap: zoom so the card fills the view. The first tap of the pair may have
      // opened or closed the card's branches; that is undone.
      frame(id) {
        const last = lastToggleRef.current;
        if (last && last.id === id && performance.now() - last.at < 600) {
          setExpanded(last.expanded);
          setOpenArticles(last.openArticles);
          historyRef.current = last.history;
        }
        lastToggleRef.current = null;
        setActiveId(id);
        cameraIntentRef.current = { type: 'frame', ids: [id] };
        setSizeVersion((v) => v + 1);
      },

      toggleTopic(id) {
        const node = nodesById.get(id);
        if (!node || !node.children.length) return;
        // Snapshot, so a double tap can undo what its first tap did.
        lastToggleRef.current = {
          id,
          at: performance.now(),
          expanded,
          openArticles,
          history: [...historyRef.current],
        };
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
        const ancestors = ancestorsOf(targetId);
        // A branch tab only holds its own subtree; anything else is shown on the home tab.
        if (targetId !== rootId && !ancestors.includes(rootId)) return onOutside?.(targetId);
        pushViewport();
        const path = ancestors.slice(0, ancestors.indexOf(rootId) + 1);
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
    [expanded, openArticles, pushViewport, popViewport, rootId, onOutside, onOpenMenu],
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
  // Only events newer than the flight count: right after a touch, d3-zoom keeps that touch
  // gesture open for ~500 ms and tags our own programmatic moves with the old touch event,
  // which used to stop the flight halfway (a double tap then left the card off-centre).
  const onMoveStart = useCallback(
    (event) => {
      if (event && event.timeStamp > flightStartRef.current) stopCamera();
    },
    [stopCamera],
  );

  const fitAll = useCallback(() => {
    historyRef.current = [];
    cameraIntentRef.current = { type: 'fit', ids: null };
    setSizeVersion((v) => v + 1);
  }, []);

  // Top-bar controls.
  const collapseAll = useCallback(() => {
    setExpanded(new Set([rootId]));
    setOpenArticles([]);
    fitAll();
  }, [fitAll, rootId]);

  // Closes the deepest open level (open articles count as the deepest level).
  const collapseLast = useCallback(() => {
    if (openArticles.length) {
      setOpenArticles([]);
    } else {
      const open = [...expanded].filter((id) => id !== rootId);
      if (!open.length) return;
      const depth = Math.max(...open.map((id) => nodesById.get(id).depth));
      setExpanded(new Set([...expanded].filter((id) => id === rootId || nodesById.get(id).depth < depth)));
    }
    historyRef.current = [];
    cameraIntentRef.current = { type: 'fit', ids: null };
  }, [expanded, openArticles, rootId]);

  if (controlsRef) controlsRef.current = { fitAll, collapseAll, collapseLast, focusNode: (id) => actions.focusNode(id) };

  // The current card for the ← / → buttons: the last one pressed or reached (an open
  // article counts as its card), or the tab's root.
  const current = useMemo(() => {
    const id = activeId?.startsWith('art:') ? activeId.split(':')[1] : activeId;
    if (!id || !nodesById.has(id)) return rootId;
    return id === rootId || ancestorsOf(id).includes(rootId) ? id : rootId;
  }, [activeId, rootId]);
  const forward = useMemo(() => nextOf(current, rootId), [current, rootId]);
  const back = useMemo(() => prevOf(current, rootId), [current, rootId]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && forward) actions.navigate(forward);
      else if (e.key === 'ArrowLeft' && back) actions.navigate(back);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, forward, back, actions]);

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
        <NavButtons back={back} forward={forward} onNavigate={actions.navigate} />
      </div>
    </MapActions.Provider>
  );
}
