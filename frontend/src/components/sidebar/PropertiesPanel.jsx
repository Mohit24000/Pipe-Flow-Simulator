import React, { useState, useEffect } from 'react';
import {
  PIPE_MATERIALS,
  VALVE_K,
  ELBOW_K,
  ENTRANCE_K,
  FLUID_PRESETS,
} from '../../constants/fluidProperties';
import { DirectionPicker } from '../canvas/PipeCanvas';

function Section({ title }) {
  return (
    <tr className="section-row">
      <td colSpan={2}>{title}</td>
    </tr>
  );
}

function Row({ label, children, unit }) {
  return (
    <tr>
      <td>{label}{unit ? <span style={{ color: '#999', fontSize: 9 }}> ({unit})</span> : ''}</td>
      <td>{children}</td>
    </tr>
  );
}

function NumInput({ name, value, onChange, step = 'any', min }) {
  return (
    <input
      className="prop-input"
      type="number"
      name={name}
      step={step}
      min={min}
      value={value ?? ''}
      onChange={onChange}
    />
  );
}

function TextInput({ name, value, onChange }) {
  return (
    <input
      className="prop-input"
      type="text"
      name={name}
      value={value ?? ''}
      onChange={onChange}
    />
  );
}

function SelectInput({ name, value, onChange, options }) {
  return (
    <select className="prop-select" name={name} value={value ?? ''} onChange={onChange}>
      {options.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}

function kineViscosity(density, dynVisc) {
  if (!density || !dynVisc) return '—';
  return (dynVisc / density).toExponential(4);
}

function SourceProps({ data, onChange }) {
  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Hydraulic" />
        <Row label="Elevation (Z)" unit="m"><NumInput name="elevation" value={data.elevation} onChange={onChange} /></Row>
        <Row label="Supply Pressure" unit="Pa"><NumInput name="supplyPressure" value={data.supplyPressure ?? 101325} onChange={onChange} /></Row>
        <Row label="External Flow" unit="m³/s">
          <NumInput name="externalFlow" value={data.externalFlow} onChange={onChange} step="0.0001" />
        </Row>

        <Section title="Entrance Loss" />
        <Row label="Entrance Type">
          <SelectInput
            name="entranceType"
            value={data.entranceType ?? 'SHARP_EDGE'}
            onChange={onChange}
            options={Object.keys(ENTRANCE_K).map(k => [k, ENTRANCE_K[k].name])}
          />
        </Row>
        <Row label="K (entrance)">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {ENTRANCE_K[data.entranceType ?? 'SHARP_EDGE']?.K ?? 0.5}
          </span>
        </Row>
      </tbody>
    </table>
  );
}

function SinkProps({ data, onChange }) {
  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Hydraulic" />
        <Row label="Elevation (Z)" unit="m"><NumInput name="elevation" value={data.elevation} onChange={onChange} /></Row>
        <Row label="Exit Pressure" unit="Pa"><NumInput name="exitPressure" value={data.exitPressure ?? 101325} onChange={onChange} /></Row>

        <Section title="Exit Loss" />
        <Row label="Exit K coefficient">
          <NumInput name="exitK" value={data.exitK ?? 1.0} onChange={onChange} step="0.01" />
        </Row>
        <Row label="Note" >
          <span style={{ fontSize: 9, color: '#666' }}>Sharp exit K=1.0</span>
        </Row>
      </tbody>
    </table>
  );
}

function PipeProps({ data, onChange }) {
  const handleMaterial = (e) => {
    const key = e.target.value;
    const mat = PIPE_MATERIALS[key];
    if (mat && mat.roughness !== null) {
      onChange({ target: { name: 'roughness',   value: mat.roughness } });
      onChange({ target: { name: 'materialKey', value: key } });
    } else {
      onChange({ target: { name: 'materialKey', value: key } });
    }
  };

  const re = (() => {
    if (!data._re) return '—';
    return Number(data._re).toLocaleString(undefined, { maximumFractionDigits: 0 });
  })();

  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Geometry" />
        <Row label="Length (L)" unit="m">
          <NumInput name="length" value={data.length} onChange={onChange} step="0.1" min="0.01" />
        </Row>
        <Row label="Inner Diameter (D)" unit="mm">
          <NumInput name="diameter" value={data.diameter} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Wall Thickness" unit="mm">
          <NumInput name="wallThickness" value={data.wallThickness ?? 5} onChange={onChange} step="0.5" min="0" />
        </Row>
        <Row label="Elevation Δz" unit="m">
          <NumInput name="elevationChange" value={data.elevationChange ?? 0} onChange={onChange} step="0.1" />
        </Row>

        <Section title="Material & Friction" />
        <Row label="Material">
          <select
            className="prop-select"
            value={data.materialKey ?? ''}
            onChange={handleMaterial}
          >
            <option value="">— Select —</option>
            {Object.keys(PIPE_MATERIALS).map(k => (
              <option key={k} value={k}>{PIPE_MATERIALS[k].name}</option>
            ))}
          </select>
        </Row>
        <Row label="Abs. Roughness (ε)" unit="m">
          <NumInput name="roughness" value={data.roughness} onChange={onChange} step="0.000001" min="0" />
        </Row>
        <Row label="Friction Method">
          <SelectInput
            name="frictionMethod"
            value={data.frictionMethod ?? 'DARCY'}
            onChange={onChange}
            options={[['DARCY', 'Darcy–Weisbach'], ['CHEZY', "Chezy's Method"]]}
          />
        </Row>
        {data.frictionMethod === 'CHEZY' && (
          <Row label="Chezy Constant (C)">
            <NumInput name="chezyC" value={data.chezyC ?? 50} onChange={onChange} step="1" />
          </Row>
        )}
        <Row label="Override f (manual)">
          <input
            type="checkbox"
            name="overrideF"
            checked={!!data.overrideF}
            onChange={(e) => onChange({ target: { name: 'overrideF', value: e.target.checked } })}
          />
        </Row>
        {data.overrideF && (
          <Row label="Friction Factor (f)">
            <NumInput name="frictionFactor" value={data.frictionFactor ?? 0.02} onChange={onChange} step="0.001" min="0" />
          </Row>
        )}

        <Section title="Minor Losses (In-Pipe)" />
        <Row label="No. of 90° Elbows">
          <NumInput name="elbows90" value={data.elbows90 ?? 0} onChange={onChange} step="1" min="0" />
        </Row>
        <Row label="No. of 45° Elbows">
          <NumInput name="elbows45" value={data.elbows45 ?? 0} onChange={onChange} step="1" min="0" />
        </Row>
        <Row label="No. of Tee (branch)">
          <NumInput name="teeBranch" value={data.teeBranch ?? 0} onChange={onChange} step="1" min="0" />
        </Row>
        <Row label="Extra K (other fittings)">
          <NumInput name="extraK" value={data.extraK ?? 0} onChange={onChange} step="0.01" min="0" />
        </Row>

        <Section title="Computed (read-only)" />
        <Row label="Reynolds No.">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{re}</span>
        </Row>
        <Row label="Flow Regime">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._regime ?? '—'}</span>
        </Row>
        <Row label="Velocity" unit="m/s">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._velocity ? Number(data._velocity).toFixed(4) : '—'}</span>
        </Row>
        <Row label="h_f major" unit="m">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._hf ? Number(data._hf).toFixed(4) : '—'}</span>
        </Row>
        <Row label="h_L minor" unit="m">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._hL ? Number(data._hL).toFixed(4) : '—'}</span>
        </Row>
      </tbody>
    </table>
  );
}

function TaperProps({ data, onChange }) {
  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Geometry" />
        <Row label="Inlet Diameter (D₁)" unit="mm">
          <NumInput name="diameterIn" value={data.diameterIn} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Outlet Diameter (D₂)" unit="mm">
          <NumInput name="diameterOut" value={data.diameterOut} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Length" unit="m">
          <NumInput name="length" value={data.length} onChange={onChange} step="0.1" min="0.01" />
        </Row>

        <Section title="Material" />
        <Row label="Absolute Roughness (ε)" unit="m">
          <NumInput name="roughness" value={data.roughness ?? 0.000046} onChange={onChange} step="0.000001" />
        </Row>

        <Section title="Loss Model" />
        <Row label="Transition Type">
          <SelectInput
            name="taperType"
            value={data.taperType ?? 'GRADUAL'}
            onChange={onChange}
            options={[['GRADUAL', 'Gradual (conical)'], ['SUDDEN', 'Sudden (Borda-Carnot)']]}
          />
        </Row>
        {data.taperType === 'GRADUAL' && (
          <Row label="Half-Angle θ" unit="°">
            <NumInput name="taperAngle" value={data.taperAngle ?? 7} onChange={onChange} step="0.5" min="0.5" max="45" />
          </Row>
        )}
        <Row label="Cc (contraction coeff.)">
          <NumInput name="contractionCc" value={data.contractionCc ?? 0.62} onChange={onChange} step="0.01" min="0.1" max="1" />
        </Row>

        <Section title="Computed" />
        <Row label="h_L minor" unit="m">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._hL ? Number(data._hL).toFixed(4) : '—'}</span>
        </Row>
      </tbody>
    </table>
  );
}

function ElbowProps({ data, onChange }) {
  const handlePreset = (e) => {
    const key = e.target.value;
    const preset = ELBOW_K[key];
    if (preset) {
      onChange({ target: { name: 'K', value: preset.K } });
      onChange({ target: { name: 'elbowPreset', value: key } });
    }
  };

  const handleDirection = (dirKey) => {
    onChange({ target: { name: 'elbowDirection', value: dirKey } });
  };

  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Flow Direction" />
        <tr>
          <td colSpan={2} style={{ padding: '4px 8px' }}>
            <DirectionPicker value={data.elbowDirection ?? 'LEFT-BOTTOM'} onChange={handleDirection} />
          </td>
        </tr>

        <Section title="Geometry" />
        <Row label="Pipe Diameter (D)" unit="mm">
          <NumInput name="diameter" value={data.diameter} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Bend Angle (θ)" unit="°">
          <NumInput name="angle" value={data.angle ?? 90} onChange={onChange} step="1" min="1" max="180" />
        </Row>
        <Row label="Bend Radius (R_B)" unit="mm">
          <NumInput name="bendRadius" value={data.bendRadius ?? 150} onChange={onChange} step="10" min="0" />
        </Row>

        <Section title="Loss Coefficient" />
        <Row label="Fitting Preset">
          <select className="prop-select" value={data.elbowPreset ?? ''} onChange={handlePreset}>
            <option value="">— Select preset —</option>
            {Object.keys(ELBOW_K).map(k => (
              <option key={k} value={k}>{ELBOW_K[k].name}</option>
            ))}
          </select>
        </Row>
        <Row label="K (loss coeff.)">
          <NumInput name="K" value={data.K ?? 0.9} onChange={onChange} step="0.01" min="0" />
        </Row>

        <Section title="Computed" />
        <Row label="h_L = K·V²/2g" unit="m">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._hL ? Number(data._hL).toFixed(4) : '—'}</span>
        </Row>
      </tbody>
    </table>
  );
}

function ValveProps({ data, onChange }) {
  const handleValveType = (e) => {
    const key = e.target.value;
    const preset = VALVE_K[key];
    if (preset) {
      onChange({ target: { name: 'K', value: preset.K } });
      onChange({ target: { name: 'valveType', value: key } });
    }
  };

  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Valve Specification" />
        <Row label="Valve Type">
          <select className="prop-select" value={data.valveType ?? ''} onChange={handleValveType}>
            <option value="">— Select —</option>
            {Object.keys(VALVE_K).map(k => (
              <option key={k} value={k}>{VALVE_K[k].name}</option>
            ))}
          </select>
        </Row>
        <Row label="Pipe Diameter (D)" unit="mm">
          <NumInput name="diameter" value={data.diameter ?? 100} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Opening %" unit="%">
          <NumInput name="openPct" value={data.openPct ?? 100} onChange={onChange} step="1" min="0" max="100" />
        </Row>

        <Section title="Loss Coefficient" />
        <Row label="K (loss coeff.)">
          <NumInput name="K" value={data.K ?? 0.1} onChange={onChange} step="0.01" min="0" />
        </Row>
        <Row label="Note">
          <span style={{ fontSize: 9, color: '#666' }}>Override K manually if needed</span>
        </Row>

        <Section title="Computed" />
        <Row label="h_L = K·V²/2g" unit="m">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._hL ? Number(data._hL).toFixed(4) : '—'}</span>
        </Row>
      </tbody>
    </table>
  );
}

function PumpProps({ data, onChange }) {
  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>
        <Row label="Pump ID / Tag"><TextInput name="pumpTag" value={data.pumpTag ?? ''} onChange={onChange} /></Row>

        <Section title="Flow Control" />
        <Row label="Flow Rate (Q)" unit="m³/s">
          <NumInput name="pumpFlow" value={data.pumpFlow ?? 0.05} onChange={onChange} step="0.001" min="0" />
        </Row>
        <Row label="Flow Rate (Q)" unit="L/min">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {data.pumpFlow ? (data.pumpFlow * 60000).toFixed(1) : '—'}
          </span>
        </Row>

        <Section title="Performance" />
        <Row label="Head Added (H)" unit="m">
          <NumInput name="pumpHead" value={data.pumpHead ?? 10} onChange={onChange} step="0.5" min="0" />
        </Row>
        <Row label="Pump Efficiency (η)" unit="%">
          <NumInput name="efficiency" value={data.efficiency ?? 80} onChange={onChange} step="1" min="1" max="100" />
        </Row>
        <Row label="Motor Power (P)" unit="kW">
          <NumInput name="motorPower" value={data.motorPower ?? 5} onChange={onChange} step="0.1" min="0" />
        </Row>
        <Row label="Shaft Speed (N)" unit="rpm">
          <NumInput name="rpm" value={data.rpm ?? 1450} onChange={onChange} step="50" min="100" />
        </Row>

        <Section title="Impeller" />
        <Row label="Impeller Diameter" unit="mm">
          <NumInput name="impellerDia" value={data.impellerDia ?? 200} onChange={onChange} step="5" min="10" />
        </Row>
        <Row label="No. of Stages">
          <NumInput name="stages" value={data.stages ?? 1} onChange={onChange} step="1" min="1" />
        </Row>

        <Section title="Installation" />
        <Row label="Pipe Diameter (D)" unit="mm">
          <NumInput name="diameter" value={data.diameter ?? 100} onChange={onChange} step="1" min="1" />
        </Row>
        <Row label="Elevation (Z)" unit="m">
          <NumInput name="elevation" value={data.elevation ?? 0} onChange={onChange} step="0.1" />
        </Row>

        <Section title="Fluid Properties (override)" />
        <Row label="Override Fluid">
          <input
            type="checkbox"
            checked={!!data.overrideFluid}
            onChange={(e) => onChange({ target: { name: 'overrideFluid', value: e.target.checked } })}
          />
        </Row>
        {data.overrideFluid && (
          <>
            <Row label="Fluid Preset">
              <select
                className="prop-select"
                value={data.fluidPresetKey ?? ''}
                onChange={(e) => {
                  const key = e.target.value;
                  const fluid = FLUID_PRESETS[key];
                  if (fluid) {
                    onChange({ target: { name: 'fluidDensity',     value: fluid.density } });
                    onChange({ target: { name: 'fluidViscosity',   value: fluid.dynamicViscosity } });
                    onChange({ target: { name: 'fluidPresetKey',   value: key } });
                    onChange({ target: { name: 'fluidTemperature', value: fluid.temperature } });
                  }
                }}
              >
                <option value="">— Select Fluid —</option>
                {Object.keys(FLUID_PRESETS).map(k => (
                  <option key={k} value={k}>{FLUID_PRESETS[k].name}</option>
                ))}
              </select>
            </Row>
            <Row label="Density (ρ)" unit="kg/m³">
              <NumInput name="fluidDensity" value={data.fluidDensity ?? 998.2} onChange={onChange} step="1" />
            </Row>
            <Row label="Dyn. Viscosity (μ)" unit="Pa·s">
              <NumInput name="fluidViscosity" value={data.fluidViscosity ?? 0.001002} onChange={onChange} step="0.0001" />
            </Row>
            <Row label="Temperature (T)" unit="°C">
              <NumInput name="fluidTemperature" value={data.fluidTemperature ?? 20} onChange={onChange} step="1" />
            </Row>
          </>
        )}

        <Section title="Computed Output" />
        <Row label="Shaft Power" unit="W">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {data.pumpFlow && data.pumpHead
              ? ((998.2 * 9.81 * (data.pumpFlow ?? 0.05) * (data.pumpHead ?? 10)) / ((data.efficiency ?? 80) / 100)).toFixed(1)
              : '—'}
          </span>
        </Row>
      </tbody>
    </table>
  );
}

function JunctionProps({ data, onChange }) {
  return (
    <table className="property-grid">
      <tbody>
        <Section title="Identification" />
        <Row label="Label"><TextInput name="label" value={data.label} onChange={onChange} /></Row>

        <Section title="Junction Settings" />
        <Row label="Type">
          <SelectInput
            name="junctionType"
            value={data.junctionType ?? 'SPLIT'}
            onChange={onChange}
            options={[['SPLIT', 'Flow Split (diverging)'], ['MERGE', 'Flow Merge (converging)'], ['BOTH', 'Tee / Cross (both)']]}
          />
        </Row>
        <Row label="Elevation (Z)" unit="m">
          <NumInput name="elevation" value={data.elevation ?? 0} onChange={onChange} step="0.1" />
        </Row>
        <Row label="Pressure" unit="Pa">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{data._pressure ? Number(data._pressure).toFixed(0) : '—'}</span>
        </Row>
        <Row label="Loss coeff. K">
          <NumInput name="K" value={data.K ?? 0.4} onChange={onChange} step="0.01" min="0" />
        </Row>
      </tbody>
    </table>
  );
}

function GlobalFluidProps({ fluid, onChange, totalFlow, onChangeFlow }) {
  const ν = kineViscosity(fluid.density, fluid.dynamicViscosity);

  const handlePreset = (e) => {
    const key = e.target.value;
    const preset = FLUID_PRESETS[key];
    if (preset) onChange({ ...preset, presetKey: key });
  };

  const handleField = (e) => {
    const { name, value } = e.target;
    onChange({ ...fluid, presetKey: 'CUSTOM', [name]: parseFloat(value) || 0 });
  };

  return (
    <table className="property-grid">
      <tbody>
        <Section title="System Flow" />
        <Row label="Total Flow (Q)" unit="m³/s">
          <input
            className="prop-input"
            type="number"
            step="0.001"
            min="0"
            value={totalFlow}
            onChange={(e) => onChangeFlow(parseFloat(e.target.value) || 0)}
          />
        </Row>
        <Row label="Total Flow (Q)" unit="L/min">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {(totalFlow * 60000).toFixed(2)}
          </span>
        </Row>
        <Row label="Total Flow (Q)" unit="L/s">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {(totalFlow * 1000).toFixed(4)}
          </span>
        </Row>

        <Section title="Fluid Identity" />
        <Row label="Fluid Preset">
          <select className="prop-select" value={fluid.presetKey ?? ''} onChange={handlePreset}>
            <option value="CUSTOM">Custom</option>
            {Object.keys(FLUID_PRESETS).map(k => (
              <option key={k} value={k}>{FLUID_PRESETS[k].name}</option>
            ))}
          </select>
        </Row>
        <Row label="Fluid Name">
          <input
            className="prop-input"
            type="text"
            name="name"
            value={fluid.name ?? ''}
            onChange={(e) => onChange({ ...fluid, name: e.target.value })}
          />
        </Row>

        <Section title="Physical Properties" />
        <Row label="Temperature (T)" unit="°C">
          <input className="prop-input" type="number" name="temperature"
            value={fluid.temperature ?? 20} step="1" onChange={handleField} />
        </Row>
        <Row label="Density (ρ)" unit="kg/m³">
          <input className="prop-input" type="number" name="density"
            value={fluid.density ?? ''} step="0.1" onChange={handleField} />
        </Row>
        <Row label="Dyn. Viscosity (μ)" unit="Pa·s">
          <input className="prop-input" type="number" name="dynamicViscosity"
            value={fluid.dynamicViscosity ?? ''} step="0.00001" onChange={handleField} />
        </Row>
        <Row label="Kin. Viscosity (ν)" unit="m²/s">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{ν}</span>
        </Row>
        <Row label="Specific Heat" unit="J/kg·K">
          <input className="prop-input" type="number" name="specificHeat"
            value={fluid.specificHeat ?? ''} step="10" onChange={handleField} />
        </Row>
        <Row label="Surface Tension (σ)" unit="N/m">
          <input className="prop-input" type="number" name="surfaceTension"
            value={fluid.surfaceTension ?? ''} step="0.001" onChange={handleField} />
        </Row>
        <Row label="Vapor Pressure" unit="Pa">
          <input className="prop-input" type="number" name="vaporPressure"
            value={fluid.vaporPressure ?? ''} step="100" onChange={handleField} />
        </Row>
        <Row label="Bulk Modulus (K)" unit="Pa">
          <input className="prop-input" type="number" name="bulkModulus"
            value={fluid.bulkModulus ?? ''} step="1e7" onChange={handleField} />
        </Row>

        <Section title="Gravity" />
        <Row label="g (gravitational)" unit="m/s²">
          <input className="prop-input" type="number" name="gravity"
            value={fluid.gravity ?? 9.81} step="0.001" onChange={handleField} />
        </Row>
      </tbody>
    </table>
  );
}

export default function PropertiesPanel({
  node,
  onUpdate,
  globalFluid,
  onChangeFluid,
  totalFlow,
  onChangeFlow,
}) {
  const [localData, setLocalData] = useState(null);

  useEffect(() => {
    setLocalData(node ? { ...node.data } : null);
  }, [node?.id]);

  useEffect(() => {
    if (node && localData) {
      const freshResultFields = ['_re', '_velocity', '_hf', '_hL', '_regime', '_pressure'];
      const changed = freshResultFields.some(f => node.data[f] !== localData[f]);
      if (changed) {
        setLocalData(prev => ({
          ...prev,
          ...Object.fromEntries(freshResultFields.map(f => [f, node.data[f]])),
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    node?.data?._re,
    node?.data?._velocity,
    node?.data?._hf,
    node?.data?._hL,
    node?.data?._regime,
    node?.data?._pressure,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const STRING_FIELDS = new Set([
      'label', 'pumpTag', 'materialKey', 'frictionMethod', 'taperType',
      'elbowPreset', 'valveType', 'junctionType', 'entranceType', 'fluidPresetKey',
      'elbowDirection',
    ]);
    setLocalData(prev => ({
      ...prev,
      [name]: typeof value === 'boolean'
        ? value
        : STRING_FIELDS.has(name)
          ? value
          : value === ''
            ? ''
            : isNaN(Number(value))
              ? value
              : Number(value),
    }));
  };

  const applyChanges = () => {
    if (!node || !localData) return;
    onUpdate(localData);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyChanges();
  };

  const renderContent = () => {
    if (!node) {
      return (
        <GlobalFluidProps
          fluid={globalFluid}
          onChange={onChangeFluid}
          totalFlow={totalFlow}
          onChangeFlow={onChangeFlow}
        />
      );
    }

    const type = localData?.type;
    const onChange = handleChange;
    const data = localData || {};

    switch (type) {
      case 'SOURCE':   return <SourceProps data={data} onChange={onChange} />;
      case 'SINK':     return <SinkProps   data={data} onChange={onChange} />;
      case 'PIPE':     return <PipeProps   data={data} onChange={onChange} />;
      case 'TAPER':    return <TaperProps  data={data} onChange={onChange} />;
      case 'ELBOW':    return <ElbowProps  data={data} onChange={onChange} />;
      case 'VALVE':    return <ValveProps  data={data} onChange={onChange} />;
      case 'PUMP':     return <PumpProps   data={data} onChange={onChange} />;
      case 'JUNCTION': return <JunctionProps data={data} onChange={onChange} />;
      default:
        return (
          <div className="props-empty">
            <span>Unknown node type: {type}</span>
          </div>
        );
    }
  };

  const headerTitle = node
    ? `${node.data.type} — ${node.data.label || node.id}`
    : 'Global Fluid / System';

  return (
    <div className="right-panel" onKeyDown={handleKeyDown}>
      <div className="panel-header" style={{ gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="5" height="5" rx="1"/>
          <rect x="9" y="2" width="5" height="5" rx="1"/>
          <rect x="2" y="9" width="5" height="5" rx="1"/>
          <rect x="9" y="9" width="5" height="5" rx="1"/>
        </svg>
        Properties
      </div>
      <div style={{ padding: '3px 6px', fontSize: 10, background: '#e8f0f8', borderBottom: '1px solid #c0d0e0', color: '#0078d4', fontWeight: 600, flexShrink: 0 }}>
        {headerTitle}
      </div>
      <div className="props-body">
        {renderContent()}
      </div>
      {node && (
        <div className="props-apply-row">
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={applyChanges}>
            Apply
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setLocalData({ ...node.data })}
            title="Reset to last saved values"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
