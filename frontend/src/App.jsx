import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ReactFlowProvider, addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import './index.css';

import PipeCanvas    from './components/canvas/PipeCanvas';
import ModelTree     from './components/sidebar/ModelTree';
import PropertiesPanel from './components/sidebar/PropertiesPanel';
import ResultsPanel  from './components/results/ResultsPanel';
import MenuBar       from './components/ui/MenuBar';
import ToolbarTabs   from './components/ui/ToolbarTabs';

import { useSimulation } from './hooks/useSimulation';
import { FLUID_PRESETS } from './constants/fluidProperties';
import { validateConnection, checkNetworkTopology } from './utils/connectionValidator';

const DEFAULT_DATA = {
  SOURCE: {
    type: 'SOURCE', label: 'Inlet',
    elevation: 10, supplyPressure: 101325, externalFlow: 0.05, entranceType: 'SHARP_EDGE',
  },
  SINK: {
    type: 'SINK', label: 'Outlet',
    elevation: 0, exitPressure: 101325, exitK: 1.0,
  },
  PIPE: {
    type: 'PIPE', label: 'Pipe',
    length: 50, diameter: 100, roughness: 0.000046, materialKey: 'COMMERCIAL_STEEL',
    frictionMethod: 'DARCY', wallThickness: 5, elevationChange: 0,
    elbows90: 0, elbows45: 0, teeBranch: 0, extraK: 0,
  },
  TAPER: {
    type: 'TAPER', label: 'Reducer',
    diameterIn: 150, diameterOut: 100, length: 1.5,
    roughness: 0.000046, taperType: 'GRADUAL', taperAngle: 7, contractionCc: 0.62,
  },
  ELBOW: {
    type: 'ELBOW', label: 'Elbow',
    diameter: 100, angle: 90, bendRadius: 150,
    elbowPreset: 'ELBOW_90_STD', K: 0.9, elbowDirection: 'LEFT-TOP',
  },
  VALVE: {
    type: 'VALVE', label: 'Valve',
    diameter: 100, valveType: 'GATE_OPEN', K: 0.1, openPct: 100,
  },
  PUMP: {
    type: 'PUMP', label: 'Pump',
    pumpHead: 20, pumpFlow: 0.05, efficiency: 80,
    motorPower: 5, rpm: 1450, impellerDia: 200, stages: 1,
    diameter: 100, elevation: 0,
  },
  JUNCTION: {
    type: 'JUNCTION', label: 'Junction',
    junctionType: 'BOTH', elevation: 0, K: 0.4,
  },
};

const NODE_TYPE_MAP = {
  SOURCE: 'sourceNode', SINK: 'sinkNode', PIPE: 'pipeNode',
  TAPER: 'taperNode', ELBOW: 'elbowNode', VALVE: 'valveNode',
  PUMP: 'pumpNode', JUNCTION: 'junctionNode',
};


const initialNodes = [
  { id: 'source-1', type: 'sourceNode', position: { x: 60, y: 160 },
    data: { ...DEFAULT_DATA.SOURCE, label: 'Inlet 1', elevation: 0, externalFlow: 0.04, entranceType: 'SHARP_EDGE' } },

  { id: 'pipe-1', type: 'pipeNode', position: { x: 220, y: 160 },
    data: { ...DEFAULT_DATA.PIPE, label: 'Pipe 1', length: 30, diameter: 100 } },

  { id: 'elbow-1', type: 'elbowNode', position: { x: 380, y: 160 },
    data: { ...DEFAULT_DATA.ELBOW, label: 'Elbow 1', diameter: 100, angle: 90, K: 0.9, elbowDirection: 'LEFT-BOTTOM' } },

  { id: 'junc-1', type: 'junctionNode', position: { x: 380, y: 280 },
    data: { ...DEFAULT_DATA.JUNCTION, label: 'Junction 1', elevation: 5 } },

  { id: 'pipe-2', type: 'pipeNode', position: { x: 540, y: 200 },
    data: { ...DEFAULT_DATA.PIPE, label: 'Pipe 2 (Branch A)', length: 40, diameter: 100 } },

  { id: 'elbow-2', type: 'elbowNode', position: { x: 700, y: 200 },
    data: { ...DEFAULT_DATA.ELBOW, label: 'Elbow 2', diameter: 100, angle: 90, K: 0.9, elbowDirection: 'LEFT-BOTTOM' } },

  { id: 'pipe-3', type: 'pipeNode', position: { x: 540, y: 360 },
    data: { ...DEFAULT_DATA.PIPE, label: 'Pipe 3 (Branch B)', length: 40, diameter: 100 } },

  { id: 'elbow-3', type: 'elbowNode', position: { x: 700, y: 360 },
    data: { ...DEFAULT_DATA.ELBOW, label: 'Elbow 3', diameter: 100, angle: 90, K: 0.9, elbowDirection: 'LEFT-TOP' } },

  { id: 'junc-2', type: 'junctionNode', position: { x: 840, y: 280 },
    data: { ...DEFAULT_DATA.JUNCTION, label: 'Junction 2', elevation: 15 } },

  { id: 'elbow-4', type: 'elbowNode', position: { x: 980, y: 280 },
    data: { ...DEFAULT_DATA.ELBOW, label: 'Elbow 4', diameter: 100, angle: 90, K: 0.9, elbowDirection: 'LEFT-BOTTOM' } },

  { id: 'pipe-4', type: 'pipeNode', position: { x: 980, y: 400 },
    data: { ...DEFAULT_DATA.PIPE, label: 'Pipe 4', length: 30, diameter: 100 } },

  { id: 'sink-1', type: 'sinkNode', position: { x: 1140, y: 400 },
    data: { ...DEFAULT_DATA.SINK, label: 'Outlet 1', elevation: 30, exitK: 1.0 } },
];

const initialEdges = [
  // Source → Pipe 1 → Elbow 1 → Junction 1
  { id: 'e1', source: 'source-1', sourceHandle: 'out', target: 'pipe-1', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e2', source: 'pipe-1', sourceHandle: 'out', target: 'elbow-1', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e3', source: 'elbow-1', sourceHandle: 'out', target: 'junc-1', targetHandle: 'in-top', type: 'smoothstep' },

  // Junction 1 splits into Branch A (Pipe 2) and Branch B (Pipe 3)
  { id: 'e4', source: 'junc-1', sourceHandle: 'out-right', target: 'pipe-2', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e5', source: 'junc-1', sourceHandle: 'out-bottom', target: 'pipe-3', targetHandle: 'in', type: 'smoothstep' },

  // Branch A: Pipe 2 → Elbow 2 → Junction 2
  { id: 'e6', source: 'pipe-2', sourceHandle: 'out', target: 'elbow-2', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e7', source: 'elbow-2', sourceHandle: 'out', target: 'junc-2', targetHandle: 'in-top', type: 'smoothstep' },

  // Branch B: Pipe 3 → Elbow 3 → Junction 2
  { id: 'e8', source: 'pipe-3', sourceHandle: 'out', target: 'elbow-3', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e9', source: 'elbow-3', sourceHandle: 'out', target: 'junc-2', targetHandle: 'in-left', type: 'smoothstep' },

  // Junction 2 merges → Elbow 4 → Pipe 4 → Outlet 1
  { id: 'e10', source: 'junc-2', sourceHandle: 'out-right', target: 'elbow-4', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e11', source: 'elbow-4', sourceHandle: 'out', target: 'pipe-4', targetHandle: 'in', type: 'smoothstep' },
  { id: 'e12', source: 'pipe-4', sourceHandle: 'out', target: 'sink-1', targetHandle: 'in', type: 'smoothstep' },
];

export default function App() {
  const reactFlowWrapper = useRef(null);
  const rfInstanceRef = useRef(null);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectionAlert, setConnectionAlert] = useState(null);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [paletteExpanded, setPaletteExpanded] = useState(true);

  const handleToggleLeft = useCallback(() => setLeftOpen(v => !v), []);
  const handleToggleRight = useCallback(() => setRightOpen(v => !v), []);
  const handleToggleZen = useCallback(() => {
    setIsZenMode(v => {
      const next = !v;
      if (next) { setLeftOpen(false); setRightOpen(false); setPaletteExpanded(false); }
      else { setLeftOpen(true); setRightOpen(true); setPaletteExpanded(true); }
      return next;
    });
  }, []);

  const [fluidProperties, setFluidProperties] = useState({
    ...FLUID_PRESETS.WATER_20,
    presetKey: 'WATER_20',
    gravity: 9.81,
  });
  const [totalFlow, setTotalFlow] = useState(0.04);

  const { runSimulation, loading, result, error, setResult, clearError } = useSimulation();

  // refs so callbacks don't go stale when state changes
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const fluidRef = useRef(fluidProperties);
  const flowRef = useRef(totalFlow);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { fluidRef.current = fluidProperties; }, [fluidProperties]);
  useEffect(() => { flowRef.current = totalFlow; }, [totalFlow]);

  const topologyWarnings = useMemo(
    () => checkNetworkTopology(nodes, edges),
    [nodes, edges]
  );

  const handleFlowChange = useCallback((newFlow) => {
    const q = parseFloat(newFlow);
    if (isNaN(q) || q <= 0) return;
    setTotalFlow(q);
    setNodes(nds => nds.map(n => {
      if (n.data?.type === 'SOURCE') {
        return { ...n, data: { ...n.data, externalFlow: q } };
      }
      return n;
    }));
    setResult(null);
  }, [setResult]);

  const onNodesChange = useCallback((changes) => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges(eds => applyEdgeChanges(changes, eds)), []);

  const isValidConnection = useCallback((connection) => {
    const tgtNode = nodesRef.current.find(n => n.id === connection.target);
    const srcNode = nodesRef.current.find(n => n.id === connection.source);
    let params = { ...connection };
    // elbow handles are always 'in' / 'out' regardless of physical direction
    if (tgtNode?.type === 'elbowNode') params.targetHandle = 'in';
    if (srcNode?.type === 'elbowNode') params.sourceHandle = 'out';
    return validateConnection(params, nodesRef.current, edgesRef.current).valid;
  }, []);

  const onConnect = useCallback((params) => {
    let finalParams = { ...params };
    const srcNode = nodesRef.current.find(n => n.id === params.source);
    const tgtNode = nodesRef.current.find(n => n.id === params.target);

    // auto-orient elbow inlet to face the incoming pipe
    if (tgtNode && tgtNode.type === 'elbowNode' && srcNode) {
      const dx = tgtNode.position.x - srcNode.position.x;
      const dy = tgtNode.position.y - srcNode.position.y;
      const curDir = tgtNode.data?.elbowDirection ?? 'LEFT-TOP';
      const [, curOut] = curDir.toLowerCase().split('-');

      let neededIn = 'left';
      if (Math.abs(dx) >= Math.abs(dy)) {
        neededIn = dx >= 0 ? 'left' : 'right';
      } else {
        neededIn = dy >= 0 ? 'top' : 'bottom';
      }

      // keep existing exit side if it's still perpendicular to the new inlet
      let neededOut = curOut;
      if (neededOut === neededIn ||
          (neededIn === 'left' && neededOut === 'right') ||
          (neededIn === 'right' && neededOut === 'left') ||
          (neededIn === 'top' && neededOut === 'bottom') ||
          (neededIn === 'bottom' && neededOut === 'top')) {
        neededOut = (dy <= 0 || neededIn === 'bottom') ? 'top' : 'bottom';
      }

      const newDir = `${neededIn.toUpperCase()}-${neededOut.toUpperCase()}`;
      if (tgtNode.data?.elbowDirection !== newDir) {
        setNodes(nds => nds.map(n => n.id === tgtNode.id ? {
          ...n,
          data: { ...n.data, elbowDirection: newDir }
        } : n));
      }
      finalParams.targetHandle = 'in';
    }

    // also orient elbow outlet when connecting from an elbow
    if (srcNode && srcNode.type === 'elbowNode' && tgtNode) {
      const dx = tgtNode.position.x - srcNode.position.x;
      const dy = tgtNode.position.y - srcNode.position.y;
      const curDir = srcNode.data?.elbowDirection ?? 'LEFT-TOP';
      const [curIn] = curDir.toLowerCase().split('-');

      let neededOut = 'top';
      if (Math.abs(dy) >= Math.abs(dx)) {
        neededOut = dy <= 0 ? 'top' : 'bottom';
      } else {
        neededOut = dx >= 0 ? 'right' : 'left';
      }

      if (neededOut !== curIn &&
          !(curIn === 'left' && neededOut === 'right') &&
          !(curIn === 'right' && neededOut === 'left') &&
          !(curIn === 'top' && neededOut === 'bottom') &&
          !(curIn === 'bottom' && neededOut === 'top')) {
        const newDir = `${curIn.toUpperCase()}-${neededOut.toUpperCase()}`;
        if (srcNode.data?.elbowDirection !== newDir) {
          setNodes(nds => nds.map(n => n.id === srcNode.id ? {
            ...n,
            data: { ...n.data, elbowDirection: newDir }
          } : n));
        }
      }
      finalParams.sourceHandle = 'out';
    }

    const check = validateConnection(finalParams, nodesRef.current, edgesRef.current);
    if (!check.valid) {
      setConnectionAlert({
        title: 'Wrong Connection',
        message: check.reason,
        hint: check.hint,
      });
      return;
    }
    setConnectionAlert(null);
    setEdges(eds => addEdge({ ...finalParams, type: 'smoothstep' }, eds));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = rfInstanceRef.current?.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    }) ?? { x: 300, y: 300 };

    const id = `${type.toLowerCase()}-${uuidv4().slice(0, 8)}`;
    const defaults = DEFAULT_DATA[type] ?? { type: type.toUpperCase(), label: type };
    const nodeType = NODE_TYPE_MAP[type] ?? `${type.toLowerCase()}Node`;

    const sameTypeCount = nodesRef.current.filter(n => n.data.type === type).length;
    const nodeData = type === 'SOURCE'
      ? { ...defaults, externalFlow: flowRef.current, label: `${defaults.label || type} ${sameTypeCount + 1}` }
      : { ...defaults, label: `${defaults.label || type} ${sameTypeCount + 1}` };

    setNodes(nds => nds.concat({ id, type: nodeType, position, data: nodeData }));
    setResult(null);
  }, [setResult]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNodeId(node ? node.id : null);
  }, []);

  const handleUpdateNode = useCallback((updatedData) => {
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNodeId) {
        // keep totalFlow in sync when user edits a source's flow rate
        if (n.data?.type === 'SOURCE' && updatedData.externalFlow != null) {
          const q = parseFloat(updatedData.externalFlow);
          if (!isNaN(q) && q > 0) setTotalFlow(q);
        }
        return { ...n, data: { ...n.data, ...updatedData } };
      }
      return n;
    }));
    setResult(null);
  }, [selectedNodeId, setResult]);

  const handleSimulate = useCallback(async () => {
    // read from refs so this callback doesn't re-create on every node/edge state change
    const data = await runSimulation(
      nodesRef.current, edgesRef.current, fluidRef.current, flowRef.current
    );
    if (data?.segments) {
      setNodes(nds => nds.map(n => {
        const seg = data.segments.find(s => s.nodeId === n.id);
        if (!seg) return n;
        return {
          ...n,
          data: {
            ...n.data,
            _re:       seg.reynoldsNumber ?? null,
            _velocity: seg.velocity       ?? null,
            _hf:       seg.hfMajor        ?? seg.majorLoss ?? null,
            _hL:       seg.hLMinor        ?? seg.minorLoss ?? null,
            _regime:   seg.flowType       ?? null,
            _pressure: seg.pressurePa     ?? seg.pressureDropPa ?? null,
          },
        };
      }));
    }
  }, [runSimulation]);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setResult(null);
    setSelectedNodeId(null);
  }, [setResult]);

  const STORAGE_KEY = 'pipeflow_saved_model';

  const handleSave = useCallback(() => {
    try {
      const model = {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        fluidProperties: fluidRef.current,
        totalFlow: flowRef.current,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
      alert('Model saved to browser storage.');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  }, []);

  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case 'new':          handleClear(); break;
      case 'simulate':     handleSimulate(); break;
      case 'save':         handleSave(); break;
      case 'clear':        handleClear(); break;
      case 'fitView':      rfInstanceRef.current?.fitView({ padding: 0.1 }); break;
      case 'delete':
        setNodes(nds => nds.filter(n => !n.selected));
        setEdges(eds => eds.filter(e => !e.selected));
        setSelectedNodeId(null);
        setResult(null);
        break;
      case 'clearResults': setResult(null); clearError(); break;
      case 'export':       /* PDF export is handled inside ResultsPanel */ break;
      default: break;
    }
  }, [handleClear, handleSimulate, handleSave, setResult, clearError]);

  const selectedNode = useMemo(() =>
    nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const statusMsg = useMemo(() => {
    if (loading) return 'Running simulation…';
    if (error) return `Error: ${error}`;
    if (result) {
      const act = (result.actualHeadLoss != null && result.actualHeadLoss > 0)
        ? result.actualHeadLoss.toFixed(3)
        : result.totalHeadLoss?.toFixed(3);
      const sum = result.totalHeadLoss?.toFixed(3) ?? '—';
      return `Simulation complete — Path Loss: ${act} m (Sum: ${sum} m)`;
    }
    return selectedNode
      ? `Selected: ${selectedNode.data.type} (${selectedNode.data.label || selectedNode.id})`
      : 'Ready';
  }, [loading, error, result, selectedNode]);

  return (
    <div className="app-shell">

      <div className="title-bar">
        <div className="title-bar-left">
          <div className="title-bar-icon">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
              <path d="M8 2L2 14h12L8 2z"/>
            </svg>
          </div>
          <span className="title-bar-text">Pipe Flow Simulator version 1.1</span>
        </div>
        <div className="title-bar-controls">
          <button className="title-ctrl">─</button>
          <button className="title-ctrl">□</button>
          <button className="title-ctrl close">✕</button>
        </div>
      </div>

      <MenuBar onAction={handleMenuAction} />

      <ToolbarTabs
        onSimulate={handleSimulate}
        onClear={handleClear}
        onSave={handleSave}
        loading={loading}
        nodesCount={nodes.length}
        edgesCount={edges.length}
        totalFlow={totalFlow}
        onFlowChange={handleFlowChange}
        onFitView={() => rfInstanceRef.current?.fitView({ padding: 0.1 })}
        leftOpen={leftOpen}
        onToggleLeft={handleToggleLeft}
        rightOpen={rightOpen}
        onToggleRight={handleToggleRight}
        isZenMode={isZenMode}
        onToggleZen={handleToggleZen}
        paletteExpanded={paletteExpanded}
        setPaletteExpanded={setPaletteExpanded}
      />

      <div className="workspace">

        {leftOpen && (
          <ModelTree
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onSelect={(node) => handleNodeSelect(node)}
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }} ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <PipeCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onInit={(instance) => { rfInstanceRef.current = instance; }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={(_, node) => handleNodeSelect(node)}
              onPaneClick={() => handleNodeSelect(null)}
              simulationResult={result}
            />
          </ReactFlowProvider>

          {connectionAlert && (
            <div className="connection-alert-box">
              <div className="connection-alert-header">
                <span>⚠</span>
                <span>{connectionAlert.title}</span>
                <button
                  className="connection-alert-close"
                  onClick={() => setConnectionAlert(null)}
                  title="Dismiss alert"
                >
                  ✕
                </button>
              </div>
              <div className="connection-alert-body">
                {connectionAlert.message}
              </div>
              {connectionAlert.hint && (
                <div className="connection-alert-hint">
                  <strong>Note:</strong> {connectionAlert.hint}
                </div>
              )}
            </div>
          )}

          {!connectionAlert && topologyWarnings.length > 0 && (
            <div className="topology-warning-banner">
              <span style={{ fontSize: 13, color: '#f59e0b' }}>⚠</span>
              <span><strong>{topologyWarnings.length} Topology Warning{topologyWarnings.length > 1 ? 's' : ''}:</strong></span>
              <span>{topologyWarnings[0].message}</span>
              {topologyWarnings[0].hint && (
                <span style={{ color: '#93c5fd', fontStyle: 'italic', marginLeft: 4 }}>
                  — {topologyWarnings[0].hint}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="error-banner" style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <strong>Simulation Error:</strong> {error}
              <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={handleSimulate}>Retry</button>
              <button className="btn btn-sm" style={{ marginLeft: 4 }} onClick={() => { setResult(null); clearError(); }}>Dismiss</button>
            </div>
          )}

          {result && (
            <ResultsPanel
              result={result}
              fluidProperties={fluidProperties}
              totalFlow={totalFlow}
              onClose={() => setResult(null)}
            />
          )}
        </div>

        {rightOpen && (
          <PropertiesPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            globalFluid={fluidProperties}
            onChangeFluid={setFluidProperties}
            totalFlow={totalFlow}
            onChangeFlow={setTotalFlow}
          />
        )}
      </div>

      <div className="status-bar">
        <div className="status-bar-item fill">
          <div className={`status-dot ${loading ? 'amber' : error ? 'red' : result ? 'green' : 'grey'}`} />
          {statusMsg}
        </div>
        <div className="status-bar-item">{nodes.length} Nodes</div>
        <div className="status-bar-item">{edges.length} Edges</div>
        <div className="status-bar-item">{fluidProperties.name ?? 'Custom Fluid'}</div>
        <div className="status-bar-item">Q = {totalFlow} m³/s</div>
        <div className="status-bar-item">
          {loading ? 'Running…' : result ? 'Ready' : 'Idle'}
        </div>
      </div>
    </div>
  );
}
