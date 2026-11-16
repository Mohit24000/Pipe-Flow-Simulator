import React, { useState, useMemo } from 'react';

const ChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
);

const NODE_TYPE_ORDER = ['SOURCE', 'PUMP', 'PIPE', 'TAPER', 'ELBOW', 'VALVE', 'JUNCTION', 'SINK'];

const TYPE_LABELS = {
  SOURCE:   'Sources',
  PUMP:     'Pumps',
  PIPE:     'Pipes',
  TAPER:    'Reducers',
  ELBOW:    'Elbows',
  VALVE:    'Valves',
  JUNCTION: 'Junctions',
  SINK:     'Outlets',
};

const TYPE_COLORS = {
  SOURCE:   '#3b82f6',
  PUMP:     '#8b5cf6',
  PIPE:     '#64748b',
  TAPER:    '#d97706',
  ELBOW:    '#0891b2',
  VALVE:    '#f59e0b',
  JUNCTION: '#6b7280',
  SINK:     '#10b981',
};

function NodeDot({ type }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: TYPE_COLORS[type] ?? '#64748b',
      flexShrink: 0,
      marginRight: 6,
    }} />
  );
}

function FolderIcon({ open }) {
  return open ? (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="#d97706">
      <path d="M1 4a1 1 0 0 1 1-1h4l1.5 2H14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4z"/>
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="#d97706">
      <path d="M1 5a1 1 0 0 1 1-1h4l1.5-2H14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5z"/>
    </svg>
  );
}

function EdgeItem({ edge, nodes, selectedNodeId, onSelect }) {
  const src = nodes.find(n => n.id === edge.source);
  const tgt = nodes.find(n => n.id === edge.target);
  return (
    <div
      className={`tree-item${selectedNodeId === edge.id ? ' selected' : ''}`}
      style={{ paddingLeft: 28 }}
      onClick={() => onSelect(null)}
    >
      <span className="tree-icon" style={{ color: '#64748b', fontSize: 10 }}>━</span>
      <span className="tree-label" style={{ fontSize: 10, color: '#555' }}>
        {src?.data?.label ?? edge.source} → {tgt?.data?.label ?? edge.target}
      </span>
    </div>
  );
}

export default function ModelTree({ nodes, edges, selectedNodeId, onSelect }) {
  const [activeTab, setActiveTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [edgesOpen, setEdgesOpen] = useState(true);
  const [hiddenTypes, setHiddenTypes] = useState(new Set());

  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleTypeVisibility = (type) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const groups = {};
    nodes.forEach(n => {
      const t = n.data?.type ?? 'UNKNOWN';
      if (!groups[t]) groups[t] = [];
      groups[t].push(n);
    });
    return groups;
  }, [nodes]);

  const filterNodes = (nodeList) => {
    if (!search) return nodeList;
    const q = search.toLowerCase();
    return nodeList.filter(n =>
      (n.data?.label ?? '').toLowerCase().includes(q) ||
      (n.data?.type ?? '').toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q)
    );
  };

  const renderBrowse = () => (
    <>
      <div className="tree-item" style={{ fontWeight: 600, fontSize: 11 }}>
        <span className="tree-toggle" onClick={() => toggle('root')}>
          {collapsed['root'] ? <ChevronRight /> : <ChevronDown />}
        </span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="#0078d4" style={{ flexShrink: 0 }}>
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#dbeafe" stroke="#0078d4" strokeWidth="1.5"/>
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="#0078d4" fontWeight="bold">M</text>
        </svg>
        <span className="tree-label">Model</span>
        <span className="tree-count">{nodes.length}N {edges.length}E</span>
      </div>

      {!collapsed['root'] && (
        <div className="tree-children">
          {NODE_TYPE_ORDER.filter(t => grouped[t]?.length > 0 && !hiddenTypes.has(t)).map(type => {
            const items = filterNodes(grouped[type] || []);
            if (!items.length) return null;
            const isOpen = !collapsed[type];
            return (
              <div key={type}>
                <div className="tree-item" onClick={() => toggle(type)}>
                  <span className="tree-toggle">{isOpen ? <ChevronDown /> : <ChevronRight />}</span>
                  <FolderIcon open={isOpen} />
                  <span className="tree-label">{TYPE_LABELS[type] ?? type}</span>
                  <span className="tree-count">{items.length}</span>
                </div>
                {isOpen && (
                  <div className="tree-children">
                    {items.map(node => (
                      <div
                        key={node.id}
                        className={`tree-item${selectedNodeId === node.id ? ' selected' : ''}`}
                        onClick={() => onSelect(node)}
                      >
                        <span className="tree-toggle" />
                        <NodeDot type={type} />
                        <span className="tree-label">{node.data?.label || node.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {edges.length > 0 && (
            <div>
              <div className="tree-item" onClick={() => setEdgesOpen(p => !p)}>
                <span className="tree-toggle">{edgesOpen ? <ChevronDown /> : <ChevronRight />}</span>
                <FolderIcon open={edgesOpen} />
                <span className="tree-label">Connections</span>
                <span className="tree-count">{edges.length}</span>
              </div>
              {edgesOpen && (
                <div className="tree-children">
                  {edges.map(e => (
                    <EdgeItem key={e.id} edge={e} nodes={nodes} selectedNodeId={selectedNodeId} onSelect={onSelect} />
                  ))}
                </div>
              )}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="tree-item" style={{ color: '#999', fontSize: 10 }}>
              <span style={{ paddingLeft: 20 }}>Empty</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderGroups = () => (
    <div style={{ padding: '8px 8px', fontSize: 11, color: '#666' }}>
      <div style={{ marginBottom: 8, fontWeight: 600, color: '#333' }}>Components by Type</div>
      {NODE_TYPE_ORDER.map(type => {
        const count = (grouped[type] ?? []).length;
        if (!count) return null;
        return (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #eee' }}>
            <NodeDot type={type} />
            <span style={{ flex: 1 }}>{TYPE_LABELS[type]}</span>
            <span style={{ background: '#e0e8f0', borderRadius: 8, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>{count}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
        <span>Nodes:</span><strong>{nodes.length}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Edges:</span><strong>{edges.length}</strong>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div style={{ padding: '8px', fontSize: 11, color: '#666' }}>
      <div style={{ marginBottom: 6, fontWeight: 600, color: '#333' }}>Filter Visibility</div>
      {NODE_TYPE_ORDER.map(type => (
        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!hiddenTypes.has(type)}
            onChange={() => toggleTypeVisibility(type)}
            style={{ cursor: 'pointer' }}
          />
          <NodeDot type={type} />
          <span>{TYPE_LABELS[type]}</span>
          <span style={{ marginLeft: 'auto', color: '#999', fontSize: 10 }}>
            {(grouped[type] ?? []).length}
          </span>
        </label>
      ))}
      {hiddenTypes.size > 0 && (
        <button
          style={{ marginTop: 8, fontSize: 10, color: '#0078d4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => setHiddenTypes(new Set())}
        >
          Reset filters
        </button>
      )}
    </div>
  );

  return (
    <div className="left-panel">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="#0078d4">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#dbeafe" stroke="#0078d4" strokeWidth="1.5"/>
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="#0078d4" fontWeight="bold">M</text>
        </svg>
        Model
      </div>

      <div className="panel-tabs">
        {['browse', 'groups', 'filters'].map(tab => (
          <div
            key={tab}
            className={`panel-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      <div className="tree-scroll">
        {activeTab === 'browse'  && renderBrowse()}
        {activeTab === 'groups'  && renderGroups()}
        {activeTab === 'filters' && renderFilters()}
      </div>

      <div className="panel-search">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="#888">
          <circle cx="6" cy="6" r="4" stroke="#888" strokeWidth="1.5" fill="none"/>
          <path d="M10 10l3 3" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          placeholder="Filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <span style={{ cursor: 'pointer', color: '#999' }} onClick={() => setSearch('')}>✕</span>
        )}
      </div>
    </div>
  );
}
