import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getSeverityColor } from '../../utils/colorMapping';

function InHandle({ id, position, style }) {
  return (
    <Handle
      type="target"
      position={position}
      id={id}
      title="Inlet (flow enters)"
      style={style}
    />
  );
}

function OutHandle({ id, position, style }) {
  return (
    <Handle
      type="source"
      position={position}
      id={id}
      title="Outlet (flow leaves)"
      style={style}
    />
  );
}

function BaseNode({ className, children, handles }) {
  const defaultHandles = handles ?? [
    { kind: 'in',  id: 'in',  position: Position.Left  },
    { kind: 'out', id: 'out', position: Position.Right },
  ];

  return (
    <div className={`canvas-node ${className}`}>
      {defaultHandles.map(h =>
        h.kind === 'in'
          ? <InHandle  key={h.id} id={h.id} position={h.position} style={h.style} />
          : <OutHandle key={h.id} id={h.id} position={h.position} style={h.style} />
      )}
      {children}
    </div>
  );
}

const SourceNode = ({ data }) => (
  <BaseNode className="node-source" handles={[
    { kind: 'out', id: 'out', position: Position.Right },
  ]}>
    <div className="node-type-label">Inlet</div>
    <div className="node-name">{data.label || 'Source'}</div>
    <div className="node-info">
      Z={data.elevation ?? 0} m &nbsp;·&nbsp;
      {data.externalFlow ? `Q=${data.externalFlow} m³/s` : 'Q=auto'}
    </div>
  </BaseNode>
);

const SinkNode = ({ data }) => (
  <BaseNode className="node-sink" handles={[
    { kind: 'in', id: 'in', position: Position.Left },
  ]}>
    <div className="node-type-label">Outlet</div>
    <div className="node-name">{data.label || 'Sink'}</div>
    <div className="node-info">Z={data.elevation ?? 0} m</div>
  </BaseNode>
);

const PipeNode = ({ data }) => (
  <BaseNode className="node-pipe" handles={[
    { kind: 'in',  id: 'in',  position: Position.Left  },
    { kind: 'out', id: 'out', position: Position.Right },
  ]}>
    <div className="node-type-label">Pipe</div>
    <div className="node-name">{data.label || 'Pipe'}</div>
    <div className="node-info">Ø{data.diameter ?? '?'} mm · {data.length ?? '?'} m</div>
    {data._velocity != null && (
      <div className="node-info" style={{ background: 'rgba(0,200,100,0.25)' }}>
        V={Number(data._velocity).toFixed(2)} m/s &nbsp; Re={Number(data._re ?? 0).toFixed(0)}
      </div>
    )}
    {data._hf != null && (
      <div className="node-info" style={{ background: 'rgba(220,50,50,0.2)' }}>
        hf={Number(data._hf).toFixed(3)} m
      </div>
    )}
  </BaseNode>
);

const TaperNode = ({ data }) => (
  <BaseNode className="node-taper" handles={[
    { kind: 'in',  id: 'in',  position: Position.Left  },
    { kind: 'out', id: 'out', position: Position.Right },
  ]}>
    <div className="node-type-label">Reducer</div>
    <div className="node-name">{data.label || 'Taper'}</div>
    <div className="node-info">Ø{data.diameterIn ?? '?'}→{data.diameterOut ?? '?'} mm</div>
  </BaseNode>
);

const DIR_MAP = {
  'LEFT-BOTTOM':  [Position.Left,   Position.Bottom],
  'LEFT-TOP':     [Position.Left,   Position.Top   ],
  'RIGHT-BOTTOM': [Position.Right,  Position.Bottom],
  'RIGHT-TOP':    [Position.Right,  Position.Top   ],
  'TOP-RIGHT':    [Position.Top,    Position.Right  ],
  'TOP-LEFT':     [Position.Top,    Position.Left   ],
  'BOTTOM-RIGHT': [Position.Bottom, Position.Right  ],
  'BOTTOM-LEFT':  [Position.Bottom, Position.Left   ],
};

function ElbowSvg({ inSide, outSide, angle, color = '#38bdf8' }) {
  const CX = 24, CY = 24, R = 14, STROKE = 3;

  const sideToVec = {
    left:   [-1,  0],
    right:  [ 1,  0],
    top:    [ 0, -1],
    bottom: [ 0,  1],
  };

  const [ix, iy] = sideToVec[inSide]  ?? [-1, 0];
  const [ox, oy] = sideToVec[outSide] ?? [ 0, 1];

  const ex1 = CX + ix * 22, ey1 = CY + iy * 22;
  const ex2 = CX + ix * R,  ey2 = CY + iy * R;
  const sx1 = CX + ox * R,  sy1 = CY + oy * R;
  const sx2 = CX + ox * 22, sy2 = CY + oy * 22;

  const cpx = CX + ix * R + ox * R;
  const cpy = CY + iy * R + oy * R;

  const arrowSize = 5;
  const ax = sx2 - ox * arrowSize;
  const ay = sy2 - oy * arrowSize;
  const px = oy * (arrowSize * 0.6);
  const py = ox * (arrowSize * 0.6);

  return (
    <svg viewBox="0 0 48 48" width="48" height="48" style={{ display: 'block' }}>
      <line x1={ex1} y1={ey1} x2={ex2} y2={ey2}
        stroke="#6b7280" strokeWidth={STROKE} strokeDasharray="3,2" strokeLinecap="round"/>
      <path
        d={`M ${ex2} ${ey2} Q ${cpx} ${cpy} ${sx1} ${sy1}`}
        fill="none" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round"/>
      <line x1={sx1} y1={sy1} x2={sx2} y2={sy2}
        stroke={color} strokeWidth={STROKE} strokeLinecap="round"/>
      <polygon
        points={`${sx2},${sy2} ${ax - px},${ay - py} ${ax + px},${ay + py}`}
        fill={color}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        fontSize="8" fontWeight="bold" fill="rgba(255,255,255,0.7)" fontFamily="monospace">
        {angle ?? 90}°
      </text>
    </svg>
  );
}

function MiniBendIcon({ inSide, outSide, active }) {
  const points = {
    top:    { x: 12, y: 3 },
    bottom: { x: 12, y: 21 },
    left:   { x: 3,  y: 12 },
    right:  { x: 21, y: 12 },
  };
  const start = points[inSide]  || points.left;
  const end   = points[outSide] || points.bottom;
  const strokeColor = active ? '#0284c7' : '#94a3b8';

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: 'block', margin: '0 auto' }}>
      <path
        d={`M ${start.x} ${start.y} Q 12 12 ${end.x} ${end.y}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={start.x} cy={start.y} r="2.8" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
      <circle cx={end.x} cy={end.y} r="2.8" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
    </svg>
  );
}

function DirectionPicker({ value, onChange }) {
  const DIRECTIONS = [
    { key: 'LEFT-TOP',     inSide: 'left',   outSide: 'top',    label: 'Left → Up',     title: 'Flow from Left, turns Up' },
    { key: 'LEFT-BOTTOM',  inSide: 'left',   outSide: 'bottom', label: 'Left → Down',   title: 'Flow from Left, turns Down' },
    { key: 'BOTTOM-RIGHT', inSide: 'bottom', outSide: 'right',  label: 'Bottom → Right',title: 'Flow from Bottom, turns Right' },
    { key: 'BOTTOM-LEFT',  inSide: 'bottom', outSide: 'left',   label: 'Bottom → Left', title: 'Flow from Bottom, turns Left' },
    { key: 'TOP-RIGHT',    inSide: 'top',    outSide: 'right',  label: 'Top → Right',   title: 'Flow from Top, turns Right' },
    { key: 'TOP-LEFT',     inSide: 'top',    outSide: 'left',   label: 'Top → Left',    title: 'Flow from Top, turns Left' },
    { key: 'RIGHT-BOTTOM', inSide: 'right',  outSide: 'bottom', label: 'Right → Down',  title: 'Flow from Right, turns Down' },
    { key: 'RIGHT-TOP',    inSide: 'right',  outSide: 'top',    label: 'Right → Up',    title: 'Flow from Right, turns Up' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '4px 0' }}>
      {DIRECTIONS.map(d => {
        const active = value === d.key;
        return (
          <button
            key={d.key}
            type="button"
            title={d.title}
            onClick={() => onChange(d.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              padding: '4px 2px', border: '1.5px solid',
              borderColor: active ? '#0284c7' : '#d1d5db',
              background: active ? '#e0f2fe' : '#ffffff',
              borderRadius: 4, cursor: 'pointer',
              boxShadow: active ? '0 0 0 2px rgba(2,132,199,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <MiniBendIcon inSide={d.inSide} outSide={d.outSide} active={active} />
            <span style={{
              fontSize: 8,
              lineHeight: 1.1,
              fontWeight: active ? 700 : 500,
              color: active ? '#0369a1' : '#475569',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ElbowNode = ({ id, data }) => {
  const direction = data.elbowDirection ?? 'LEFT-TOP';
  const [inPos, outPos] = DIR_MAP[direction] ?? [Position.Left, Position.Top];
  const [inSide, outSide] = direction.toLowerCase().split('-');
  const { setNodes, getEdges, getNode } = useReactFlow();

  const handleRotate = (e) => {
    e.stopPropagation();
    const inEdge = getEdges().find(edge => edge.target === id);
    let nextDir;

    if (inEdge) {
      const src = getNode(inEdge.source);
      const tgt = getNode(id);
      let fixedIn = inSide;
      if (src && tgt) {
        const dx = tgt.position.x - src.position.x;
        const dy = tgt.position.y - src.position.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          fixedIn = dx >= 0 ? 'left' : 'right';
        } else {
          fixedIn = dy >= 0 ? 'top' : 'bottom';
        }
      }

      if (fixedIn === 'left') {
        nextDir = direction === 'LEFT-TOP' ? 'LEFT-BOTTOM' : 'LEFT-TOP';
      } else if (fixedIn === 'right') {
        nextDir = direction === 'RIGHT-TOP' ? 'RIGHT-BOTTOM' : 'RIGHT-TOP';
      } else if (fixedIn === 'top') {
        nextDir = direction === 'TOP-RIGHT' ? 'TOP-LEFT' : 'TOP-RIGHT';
      } else {
        nextDir = direction === 'BOTTOM-RIGHT' ? 'BOTTOM-LEFT' : 'BOTTOM-RIGHT';
      }
    } else {
      const order = [
        'LEFT-TOP', 'LEFT-BOTTOM',
        'BOTTOM-RIGHT', 'BOTTOM-LEFT',
        'TOP-RIGHT', 'TOP-LEFT',
        'RIGHT-BOTTOM', 'RIGHT-TOP',
      ];
      const curIdx = order.indexOf(direction);
      nextDir = order[(curIdx + 1) % order.length];
    }

    setNodes(nds => nds.map(n => n.id === id ? {
      ...n,
      data: { ...n.data, elbowDirection: nextDir }
    } : n));
  };

  return (
    <div
      className="canvas-node node-elbow"
      style={{
        minWidth: 96,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        position: 'relative',
      }}
    >
      <InHandle
        id="in"
        position={inPos}
        style={{
          width: 14,
          height: 14,
          background: '#16a34a',
          border: '2px solid #4ade80',
          boxShadow: '0 0 4px rgba(74,222,128,0.5)',
          zIndex: 30,
          cursor: 'crosshair',
        }}
      />
      <OutHandle
        id="out"
        position={outPos}
        style={{
          width: 14,
          height: 14,
          background: '#d97706',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 4px rgba(251,191,36,0.5)',
          zIndex: 30,
          cursor: 'crosshair',
        }}
      />

      <div className="node-type-label" style={{ fontSize: 8, letterSpacing: '0.05em' }}>
        Elbow
      </div>
      <div className="node-name" style={{ fontSize: 11 }}>{data.label || 'Elbow'}</div>

      <ElbowSvg inSide={inSide} outSide={outSide} angle={data.angle ?? 90} />

      <button
        type="button"
        className="nodrag"
        onClick={handleRotate}
        title="Rotate bend direction"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '2px 6px',
          background: 'rgba(56, 189, 248, 0.15)',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          borderRadius: 3,
          cursor: 'pointer',
          fontSize: 8.5,
          fontWeight: 600,
          color: '#7dd3fc',
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700 }}>↻</span>
        <span>{inSide.toUpperCase()} → {outSide.toUpperCase()}</span>
      </button>

      <div className="node-info" style={{ fontSize: 9 }}>
        {data.angle ?? 90}° · K={data.K ?? 0.9}
      </div>
      {data._hL != null && (
        <div className="node-info" style={{ fontSize: 9, background: 'rgba(220,50,50,0.2)' }}>
          hL={Number(data._hL).toFixed(3)} m
        </div>
      )}
    </div>
  );
};

const ValveNode = ({ data }) => (
  <BaseNode className="node-valve" handles={[
    { kind: 'in',  id: 'in',  position: Position.Left  },
    { kind: 'out', id: 'out', position: Position.Right },
  ]}>
    <div className="node-type-label">Valve</div>
    <div className="node-name">{data.label || 'Valve'}</div>
    <div className="node-info">K={data.K ?? 0.1} · {data.openPct ?? 100}% open</div>
  </BaseNode>
);

const PumpNode = ({ data }) => (
  <BaseNode className="node-pump" handles={[
    { kind: 'in',  id: 'in',  position: Position.Left  },
    { kind: 'out', id: 'out', position: Position.Right },
  ]}>
    <div className="node-type-label">Pump</div>
    <div className="node-name">{data.label || 'Pump'}</div>
    <div className="node-info">H={data.pumpHead ?? '?'} m</div>
    {data.pumpFlow != null && (
      <div className="node-info">Q={Number(data.pumpFlow * 1000).toFixed(1)} L/s</div>
    )}
  </BaseNode>
);

const JunctionNode = ({ data }) => (
  <div className="canvas-node node-junction" style={{ position: 'relative' }}>
    <InHandle  id="in-left"   position={Position.Left}   />
    <InHandle  id="in-top"    position={Position.Top}    />
    <OutHandle id="out-right"  position={Position.Right}  />
    <OutHandle id="out-bottom" position={Position.Bottom} />

    <div className="node-type-label">Junction</div>
    <div className="node-name">{data.label || 'Junction'}</div>
    {data._pressure != null && (
      <div className="node-info">{(data._pressure / 1000).toFixed(1)} kPa</div>
    )}
  </div>
);

const nodeTypes = {
  sourceNode:   SourceNode,
  sinkNode:     SinkNode,
  pipeNode:     PipeNode,
  taperNode:    TaperNode,
  elbowNode:    ElbowNode,
  valveNode:    ValveNode,
  pumpNode:     PumpNode,
  junctionNode: JunctionNode,
};

function AxisIndicator() {
  return (
    <svg className="axis-indicator" viewBox="0 0 56 56">
      <line x1="10" y1="46" x2="46" y2="46" stroke="#ef4444" strokeWidth="2"/>
      <polygon points="46,43 52,46 46,49" fill="#ef4444"/>
      <text x="50" y="50" fontSize="7" fill="#ef4444" fontWeight="bold">X</text>
      <line x1="10" y1="46" x2="10" y2="10" stroke="#22c55e" strokeWidth="2"/>
      <polygon points="7,10 10,4 13,10" fill="#22c55e"/>
      <text x="4" y="8" fontSize="7" fill="#22c55e" fontWeight="bold">Y</text>
      <line x1="10" y1="46" x2="30" y2="32" stroke="#3b82f6" strokeWidth="2"/>
      <polygon points="28,30 32,28 30,34" fill="#3b82f6"/>
      <text x="32" y="28" fontSize="7" fill="#3b82f6" fontWeight="bold">Z</text>
      <circle cx="10" cy="46" r="2.5" fill="#ffffff" opacity="0.6"/>
    </svg>
  );
}

export default function PipeCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange, onConnect,
  onInit, onDrop, onDragOver,
  onNodeClick, onPaneClick,
  simulationResult,
  isValidConnection,
}) {
  const styledEdges = useMemo(() => {
    if (!simulationResult?.segments) return edges.map(e => ({
      ...e,
      style: { stroke: '#3b82f6', strokeWidth: 2.5 },
      type: 'smoothstep',
    }));

    return edges.map(edge => {
      const seg = simulationResult.segments.find(
        s => s.nodeId === edge.target || s.nodeId === edge.source
      );
      if (seg) {
        const color = getSeverityColor(seg.severityScore ?? 0);
        return {
          ...edge,
          animated: (seg.flowRate ?? 0) > 0,
          style: { stroke: color, strokeWidth: 3.5 },
          type: 'smoothstep',
          label: seg.velocity != null ? `${Number(seg.velocity).toFixed(2)} m/s` : undefined,
          labelBgStyle: { fill: '#1a2744', fillOpacity: 0.9 },
          labelStyle: { fill: '#e2e8f0', fontWeight: 700, fontSize: 10 },
        };
      }
      return { ...edge, style: { stroke: '#3b82f6', strokeWidth: 2.5 }, type: 'smoothstep' };
    });
  }, [edges, simulationResult]);

  return (
    <div className="viewport-wrap" onDrop={onDrop} onDragOver={onDragOver}>
      <AxisIndicator />

      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={(instance) => {
          onInit(instance);
        }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={3}
        snapToGrid
        snapGrid={[15, 15]}
        connectionLineStyle={{ stroke: '#4ade80', strokeWidth: 2.5, strokeDasharray: '5,3' }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#3b82f6', strokeWidth: 2.5 } }}
      >
        <Background color="#94a3b8" gap={25} size={1.5} style={{ background: 'var(--bg-viewport)' }} />
        <Controls style={{ bottom: 8, left: 8 }} />
        <MiniMap
          nodeColor={(n) => {
            const colors = {
              sourceNode: '#3b82f6', sinkNode: '#10b981',
              pumpNode: '#8b5cf6', valveNode: '#f59e0b',
              pipeNode: '#475569', elbowNode: '#0891b2',
              taperNode: '#d97706', junctionNode: '#6b7280',
            };
            return colors[n.type] ?? '#475569';
          }}
          maskColor="rgba(226, 232, 240, 0.6)"
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', bottom: 8, right: 8 }}
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

export { DirectionPicker, DIR_MAP };
