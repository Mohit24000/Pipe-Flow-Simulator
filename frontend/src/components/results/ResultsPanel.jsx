import React, { useState } from 'react';
import { exportSimulationToPDF } from '../../utils/pdfExport';
import { getSeverityColor } from '../../utils/colorMapping';

const G = 9.81;

function Badge({ regime }) {
  const cls = regime === 'LAMINAR'      ? 'badge-laminar'
            : regime === 'TURBULENT'    ? 'badge-turbulent'
            : 'badge-transition';
  return <span className={`badge ${cls}`}>{regime}</span>;
}

function SeverityBar({ score }) {
  const pct   = Math.min(100, Math.max(0, (score ?? 0) * 100));
  const color = getSeverityColor(score ?? 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 60, height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

function n(val) {
  const f = parseFloat(val);
  return isNaN(f) ? 0 : f;
}

export default function ResultsPanel({ result, fluidProperties, totalFlow, onClose }) {
  const [tab, setTab] = useState('segments');
  const [isMinimized, setIsMinimized] = useState(false);

  const handleExport = () => exportSimulationToPDF(result, fluidProperties, totalFlow);

  const segments = result?.segments ?? [];

  const pipeSeg       = segments.filter(s => ['PIPE', 'TAPER', 'ELBOW'].includes(s.type));
  const totalHfMajor  = pipeSeg.reduce((a, s) => a + n(s.majorLoss), 0);
  const totalHlMinor  = pipeSeg.reduce((a, s) => a + n(s.minorLoss), 0);
  const totalHl       = totalHfMajor + totalHlMinor;

  const summaryMajor  = n(result?.totalMajorLoss) || totalHfMajor;
  const summaryMinor  = n(result?.totalMinorLoss) || totalHlMinor;
  const summaryTotal  = n(result?.totalHeadLoss)  || totalHl;
  const summaryActual = n(result?.actualHeadLoss) > 0 ? n(result?.actualHeadLoss) : summaryTotal;
  const actualDp      = n(result?.actualPressureDropPa) > 0 ? n(result?.actualPressureDropPa) : n(result?.totalPressureDropPa);

  return (
    <div className={`results-dock${isMinimized ? ' minimized' : ''}`}>
      <div className="results-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Simulation Results
            {result.converged
              ? <span className="badge-converged">Converged</span>
              : <span className="badge-not-converged">Not Converged</span>
            }
          </h2>

          {isMinimized && (
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>
              Actual Path Loss: <strong style={{ color: '#0284c7' }}>{summaryActual.toFixed(3)} m</strong> ·
              Total Sum: {summaryTotal.toFixed(3)} m · Major: {summaryMajor.toFixed(3)} m · Minor: {summaryMinor.toFixed(3)} m
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            className="btn btn-sm"
            onClick={() => setIsMinimized(m => !m)}
            title={isMinimized ? "Expand full results panel" : "Minimize results panel to compact bar"}
          >
            {isMinimized ? '▲ Expand' : '▼ Minimize'}
          </button>
          <button className="btn btn-sm" onClick={handleExport} title="Export PDF report">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export PDF
          </button>
          <button className="btn btn-sm" onClick={onClose} title="Close results">✕</button>
        </div>
      </div>

      {!isMinimized && (
        <div className="results-body">
        <div className="results-summary">
          <div className="results-stat" style={{ background: '#f0f9ff', border: '1.5px solid #0284c7', borderRadius: 4, padding: '5px 8px' }}>
            <div className="results-stat-label" style={{ color: '#0369a1', fontWeight: 700 }}>Actual Head Loss (Path)</div>
            <div className="results-stat-value" style={{ color: '#0284c7', fontSize: 16 }}>{summaryActual.toFixed(3)} m</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>Inlet → Outlet path loss</div>
          </div>
          <div className="results-stat">
            <div className="results-stat-label">Summed Head Loss</div>
            <div className="results-stat-value amber">{summaryTotal.toFixed(3)} m</div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>All segments sum</div>
          </div>
          <div className="results-stat">
            <div className="results-stat-label">Major Loss (Friction)</div>
            <div className="results-stat-value blue">{summaryMajor.toFixed(3)} m</div>
          </div>
          <div className="results-stat">
            <div className="results-stat-label">Minor Loss (Fittings)</div>
            <div className="results-stat-value blue">{summaryMinor.toFixed(3)} m</div>
          </div>
          <div className="results-stat">
            <div className="results-stat-label">Actual Pressure Drop</div>
            <div className="results-stat-value blue">
              {actualDp.toLocaleString(undefined, { maximumFractionDigits: 0 })} Pa
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>{(actualDp / 1000).toFixed(1)} kPa · {(actualDp / 100000).toFixed(3)} bar</div>
          </div>
          {n(result?.totalPumpHead) > 0 && (
            <div className="results-stat">
              <div className="results-stat-label">Total Pump Head</div>
              <div className="results-stat-value" style={{ color: '#7c3aed' }}>
                {n(result.totalPumpHead).toFixed(3)} m
              </div>
            </div>
          )}
          {n(result?.requiredPumpHead) > 0 && (
            <div className="results-stat" style={{ background: '#ede9fe', borderRadius: 4, padding: '4px 6px' }}>
              <div className="results-stat-label" style={{ color: '#7c3aed' }}>Required Pump Head</div>
              <div className="results-stat-value" style={{ color: '#7c3aed' }}>
                {n(result.requiredPumpHead).toFixed(3)} m
              </div>
            </div>
          )}
          <div className="results-stat">
            <div className="results-stat-label">Hardy-Cross Iterations</div>
            <div className="results-stat-value">{result?.hardyCrossIterations ?? 0}</div>
          </div>
          {result.warnings?.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 3, padding: '4px 6px', fontSize: 10 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>⚠ Warnings</div>
              {result.warnings.map((w, i) => <div key={i} style={{ color: '#b91c1c' }}>• {w}</div>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: '#e8e8e8', borderBottom: '1px solid #c8c8c8', flexShrink: 0 }}>
            {[
              { id: 'segments', label: 'All Segments' },
              { id: 'major',    label: 'Major Losses' },
              { id: 'minor',    label: 'Minor Losses' },
              { id: 'pressure', label: 'Pressure' },
            ].map(t => (
              <div
                key={t.id}
                style={{
                  padding: '3px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: tab === t.id ? 700 : 400,
                  color:  tab === t.id ? '#0078d4' : '#555',
                  borderBottom: tab === t.id ? '2px solid #0078d4' : '2px solid transparent',
                  background:   tab === t.id ? '#f5f5f5' : 'transparent',
                }}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="results-table-wrap">
            {tab === 'segments' && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Q (m³/s)</th>
                    <th>V (m/s)</th>
                    <th>Re</th>
                    <th>Regime</th>
                    <th>f</th>
                    <th>hf Major (m)</th>
                    <th>hm Minor (m)</th>
                    <th>Total hL (m)</th>
                    <th>Pump Head (m)</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map(seg => {
                    const hf    = n(seg.majorLoss);
                    const hm    = n(seg.minorLoss);
                    const total = hf + hm;
                    const pump  = n(seg.pumpHead);
                    return (
                      <tr key={seg.nodeId}>
                        <td className="mono" style={{ fontSize: 10 }}>{seg.nodeId}</td>
                        <td><span className="badge" style={{ background: '#e5e7eb', color: '#374151' }}>{seg.type}</span></td>
                        <td className="mono">{n(seg.flowRate).toFixed(5)}</td>
                        <td className="mono">{n(seg.velocity).toFixed(3)}</td>
                        <td className="mono">{n(seg.reynoldsNumber).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td><Badge regime={seg.flowType ?? '—'} /></td>
                        <td className="mono">{seg.frictionFactor ? Number(seg.frictionFactor).toFixed(4) : '—'}</td>
                        <td className="mono" style={{ color: hf > 0.5 ? '#d97706' : '#333' }}>{hf.toFixed(4)}</td>
                        <td className="mono" style={{ color: hm > 0.1 ? '#0891b2' : '#333' }}>{hm.toFixed(4)}</td>
                        <td className="mono font-bold" style={{ color: getSeverityColor(seg.severityScore) }}>{total.toFixed(4)}</td>
                        <td className="mono" style={{ color: pump > 0 ? '#7c3aed' : '#aaa' }}>{pump > 0 ? pump.toFixed(3) : '—'}</td>
                        <td><SeverityBar score={seg.severityScore} /></td>
                      </tr>
                    );
                  })}
                  {segments.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: 'center', color: '#999', padding: 16 }}>No segment data available</td></tr>
                  )}
                  {segments.length > 0 && (
                    <tr style={{ background: '#f0f0f0', fontWeight: 700 }}>
                      <td colSpan={7} style={{ textAlign: 'right', color: '#555', fontSize: 10, textTransform: 'uppercase' }}>TOTALS</td>
                      <td className="mono" style={{ color: '#d97706' }}>{summaryMajor.toFixed(4)}</td>
                      <td className="mono" style={{ color: '#0891b2' }}>{summaryMinor.toFixed(4)}</td>
                      <td className="mono" style={{ color: getSeverityColor(0.7) }}>{summaryTotal.toFixed(4)}</td>
                      <td className="mono" style={{ color: '#7c3aed' }}>{n(result?.totalPumpHead).toFixed(4)}</td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'major' && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>L (m)</th>
                    <th>D (mm)</th>
                    <th>V (m/s)</th>
                    <th>Re</th>
                    <th>f</th>
                    <th>hf = f·L·V²/2gD (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.filter(s => ['PIPE','TAPER','ELBOW'].includes(s.type)).map(seg => (
                    <tr key={seg.nodeId}>
                      <td className="mono" style={{ fontSize: 10 }}>{seg.nodeId}</td>
                      <td>{seg.type}</td>
                      <td style={{ fontSize: 10 }}>Darcy–Weisbach</td>
                      <td className="mono">{n(seg.length).toFixed(2)}</td>
                      <td className="mono">{(n(seg.diameter) * 1000).toFixed(1)}</td>
                      <td className="mono">{n(seg.velocity).toFixed(3)}</td>
                      <td className="mono">{n(seg.reynoldsNumber).toLocaleString()}</td>
                      <td className="mono">{seg.frictionFactor ? Number(seg.frictionFactor).toFixed(5) : '—'}</td>
                      <td className="mono font-bold" style={{ color: '#d97706' }}>
                        {n(seg.majorLoss).toFixed(5)}
                      </td>
                    </tr>
                  ))}
                  {segments.filter(s => ['PIPE','TAPER','ELBOW'].includes(s.type)).length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 12 }}>No pipe segments</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'minor' && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Type</th>
                    <th>K (derived)</th>
                    <th>V (m/s)</th>
                    <th>V²/2g (m)</th>
                    <th>hm = K·V²/2g (m)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.filter(s => n(s.minorLoss) > 0 || ['VALVE','ELBOW','TAPER','SOURCE','SINK','JUNCTION'].includes(s.type)).map(seg => {
                    const v    = n(seg.velocity);
                    const v2g  = (v * v) / (2 * G);
                    const hm   = n(seg.minorLoss);
                    const kDerived = (v2g > 1e-9) ? (hm / v2g).toFixed(3) : '—';
                    return (
                      <tr key={seg.nodeId}>
                        <td className="mono" style={{ fontSize: 10 }}>{seg.nodeId}</td>
                        <td>{seg.type}</td>
                        <td className="mono">{kDerived}</td>
                        <td className="mono">{v.toFixed(3)}</td>
                        <td className="mono">{v2g.toFixed(5)}</td>
                        <td className="mono font-bold" style={{ color: '#0891b2' }}>{hm.toFixed(5)}</td>
                        <td style={{ fontSize: 10, color: '#666' }}>{seg.minorLossNote ?? ''}</td>
                      </tr>
                    );
                  })}
                  {segments.filter(s => n(s.minorLoss) > 0).length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 12 }}>No minor losses calculated</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'pressure' && (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Node</th>
                    <th>Type</th>
                    <th>ΔP (Pa)</th>
                    <th>ΔP (kPa)</th>
                    <th>ΔP (bar)</th>
                    <th>Net Head Loss (m)</th>
                    <th>Pump Head (m)</th>
                    <th>Elevation (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map(seg => {
                    const dp     = n(seg.pressureDropPa);
                    const hNet   = n(seg.netHeadLoss);
                    const pump   = n(seg.pumpHead);
                    return (
                      <tr key={seg.nodeId}>
                        <td className="mono" style={{ fontSize: 10 }}>{seg.nodeId}</td>
                        <td>{seg.type}</td>
                        <td className="mono">{dp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="mono">{(dp / 1000).toFixed(2)}</td>
                        <td className="mono">{(dp / 100000).toFixed(4)}</td>
                        <td className="mono" style={{ color: hNet < 0 ? '#7c3aed' : '#374151' }}>{hNet.toFixed(4)}</td>
                        <td className="mono" style={{ color: pump > 0 ? '#7c3aed' : '#aaa' }}>{pump > 0 ? pump.toFixed(3) : '—'}</td>
                        <td className="mono">{n(seg.elevation ?? 0).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
