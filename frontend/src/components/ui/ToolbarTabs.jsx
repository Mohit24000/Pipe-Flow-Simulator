import React, { useState } from 'react';

const icons = {
  Source: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12l4 4 4-4"/>
    </svg>
  ),
  Sink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8"/><path d="M12 16V8M8 12l4-4 4 4"/>
    </svg>
  ),
  Pipe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="8" width="20" height="8" rx="2"/>
      <circle cx="5" cy="12" r="2" fill="#94a3b8"/>
      <circle cx="19" cy="12" r="2" fill="#94a3b8"/>
    </svg>
  ),
  Taper: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
      <path d="M2 7h6v10H2zM8 9l14 2-14 2z"/>
    </svg>
  ),
  Elbow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4h8v8"/><rect x="4" y="4" width="5" height="5" rx="1" fill="none"/>
      <path d="M12 12v8"/>
    </svg>
  ),
  Valve: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="8" width="18" height="8" rx="1"/>
      <path d="M12 2v4M12 18v4M8 12h8" strokeDasharray="2 1"/>
    </svg>
  ),
  Pump: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
      <circle cx="12" cy="12" r="8"/>
      <path d="M12 8v4l3 3" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="#8b5cf6"/>
    </svg>
  ),
  Junction: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M2 12h6M16 12h6M12 2v6M12 16v6"/>
    </svg>
  ),
};

const TABS = [
  {
    id: 'components',
    label: 'Components',
    groups: [
      {
        label: 'Sources & Sinks',
        items: [
          { type: 'SOURCE', label: 'Inlet',   Icon: icons.Source, color: '#3b82f6' },
          { type: 'SINK',   label: 'Outlet',  Icon: icons.Sink,   color: '#10b981' },
        ],
      },
      {
        label: 'Piping',
        items: [
          { type: 'PIPE',  label: 'Pipe',  Icon: icons.Pipe,  color: '#94a3b8' },
          { type: 'ELBOW', label: 'Elbow', Icon: icons.Elbow, color: '#0891b2' },
        ],
      },
      {
        label: 'Equipment',
        items: [
          {
            type: 'PUMP',
            label: 'Pump',
            disabled: true,
            badge: 'Planned',
            Icon: icons.Pump,
            color: '#8b5cf6',
          },
          { type: 'JUNCTION', label: 'Junction', Icon: icons.Junction, color: '#6b7280' },
        ],
      },
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation',
    groups: [],
  },
  {
    id: 'fluids',
    label: 'Fluids',
    groups: [],
  },
  {
    id: 'results',
    label: 'Results',
    groups: [],
  },
];

function PaletteItem({ type, label, badge, disabled, Icon }) {
  const onDragStart = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`palette-item${disabled ? ' disabled' : ''}`}
      draggable={!disabled}
      onDragStart={onDragStart}
      title={disabled ? `${label} (Coming soon)` : `Add ${label}`}
      style={{
        position: 'relative',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'grab',
        minWidth: 60,
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -3,
          background: '#64748b',
          color: '#ffffff',
          fontSize: 7,
          fontWeight: 600,
          padding: '1px 3px',
          borderRadius: 2,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}>
          {badge}
        </span>
      )}
      <div style={{ width: 22, height: 22 }}>
        <Icon />
      </div>
      <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.15, color: disabled ? '#888' : '#333' }}>
        {label}
      </span>
    </div>
  );
}

function ToolbarRow({
  onSimulate, onClear, loading, nodesCount, edgesCount, onFitView, onSave,
  leftOpen, onToggleLeft, rightOpen, onToggleRight, isZenMode, onToggleZen,
  totalFlow, onFlowChange,
}) {
  return (
    <div className="toolbar-icon-row">
      <div className="toolbar-icon-group">
        <button className="toolbar-btn" title="New Model" onClick={onClear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="btn-label">New</span>
        </button>
        <button className="toolbar-btn" title="Save" onClick={onSave}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span className="btn-label">Save</span>
        </button>
      </div>

      <div className="toolbar-icon-group">
        <button className="toolbar-btn" title="Fit to view" onClick={onFitView}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <span className="btn-label">Fit</span>
        </button>

        <button
          className={`toolbar-btn${leftOpen ? ' active-panel-btn' : ''}`}
          title={leftOpen ? "Hide Model Tree" : "Show Model Tree"}
          onClick={onToggleLeft}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          <span className="btn-label">Tree</span>
        </button>

        <button
          className={`toolbar-btn${rightOpen ? ' active-panel-btn' : ''}`}
          title={rightOpen ? "Hide Properties" : "Show Properties"}
          onClick={onToggleRight}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
          <span className="btn-label">Props</span>
        </button>

        <button
          className={`toolbar-btn${isZenMode ? ' active-zen-btn' : ''}`}
          title={isZenMode ? "Restore standard view" : "Maximize view"}
          onClick={onToggleZen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          <span className="btn-label">{isZenMode ? 'Restore' : 'Max'}</span>
        </button>
      </div>

      <div style={{ fontSize: 10, color: '#666', padding: '0 8px', borderRight: '1px solid #ccc', marginRight: 4, whiteSpace: 'nowrap' }}>
        {nodesCount} Nodes · {edgesCount} Edges
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 3,
          padding: '2px 8px',
          marginRight: 6,
        }}
        title="Flow Rate (Q)"
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Q =</span>
        <input
          type="number"
          step="0.005"
          min="0.0001"
          style={{
            width: 58,
            height: 20,
            border: '1px solid #cbd5e1',
            borderRadius: 2,
            padding: '1px 4px',
            fontSize: 11,
            color: '#0f172a',
            outline: 'none',
            background: '#f8fafc',
          }}
          value={totalFlow ?? 0.04}
          onChange={(e) => onFlowChange?.(parseFloat(e.target.value) || 0)}
        />
        <span style={{ fontSize: 10, color: '#64748b' }}>m³/s</span>
      </div>

      <button
        className="toolbar-btn simulate-btn"
        onClick={onSimulate}
        disabled={loading || nodesCount === 0}
        title="Run simulation (F5)"
      >
        {loading ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/>
            </svg>
            Simulating…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 13, height: 13 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Run Simulation
          </>
        )}
      </button>

      <div className="toolbar-icon-group" style={{ marginLeft: 'auto' }}>
        <button className="toolbar-btn btn-danger" title="Clear canvas" onClick={onClear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <span className="btn-label">Clear</span>
        </button>
      </div>
    </div>
  );
}

export default function ToolbarTabs({
  onSimulate, onClear, loading, nodesCount, edgesCount, onFitView, onSave,
  leftOpen, onToggleLeft, rightOpen, onToggleRight, isZenMode, onToggleZen,
  paletteExpanded, setPaletteExpanded,
  totalFlow, onFlowChange,
}) {
  const [activeTab, setActiveTab] = useState('components');
  const activeTabData = TABS.find(t => t.id === activeTab);

  return (
    <div className="toolbar-section">
      <div className="toolbar-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(tab => (
            <div
              key={tab.id}
              className={`toolbar-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => {
                if (activeTab === tab.id) {
                  setPaletteExpanded(p => !p);
                } else {
                  setActiveTab(tab.id);
                  setPaletteExpanded(true);
                }
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <button
          onClick={() => setPaletteExpanded(p => !p)}
          title={paletteExpanded ? "Collapse panel" : "Expand panel"}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 10,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 3,
            fontWeight: 500,
          }}
        >
          <span>{paletteExpanded ? '▲ Hide' : '▼ Show'}</span>
        </button>
      </div>

      <ToolbarRow
        onSimulate={onSimulate}
        onClear={onClear}
        loading={loading}
        nodesCount={nodesCount}
        edgesCount={edgesCount}
        onFitView={onFitView}
        onSave={onSave}
        leftOpen={leftOpen}
        onToggleLeft={onToggleLeft}
        rightOpen={rightOpen}
        onToggleRight={onToggleRight}
        isZenMode={isZenMode}
        onToggleZen={onToggleZen}
        totalFlow={totalFlow}
        onFlowChange={onFlowChange}
      />

      {activeTab === 'components' && paletteExpanded && (
        <div className="palette-ribbon">
          <div className="palette-groups-row">
            {activeTabData.groups.map(group => (
              <div key={group.label} className="palette-group">
                <div className="palette-group-title">{group.label}</div>
                <div className="palette-group-items">
                  {group.items.map(item => (
                    <PaletteItem key={item.type} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fluids' && paletteExpanded && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: '#666', background: '#f8f8f8', borderTop: '1px solid #d0d0d0' }}>
          Select canvas background to edit global fluid properties.
        </div>
      )}

      {activeTab === 'simulation' && paletteExpanded && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: '#444', background: '#f8f8f8', borderTop: '1px solid #d0d0d0' }}>
          Solver: Hardy-Cross loop iteration with Darcy-Weisbach friction formulation.
        </div>
      )}

      {activeTab === 'results' && paletteExpanded && (
        <div style={{ padding: '6px 10px', fontSize: 11, color: '#444', background: '#f8f8f8', borderTop: '1px solid #d0d0d0' }}>
          Simulation output displays below the canvas upon calculation.
        </div>
      )}
    </div>
  );
}
