function normalizeValveType(valveType) {
  if (!valveType) return 'GATE';
  const bases = ['GATE', 'BALL', 'GLOBE', 'CHECK', 'BUTTERFLY', 'NEEDLE', 'ANGLE'];
  const upper = valveType.toUpperCase();
  for (const base of bases) {
    if (upper.startsWith(base)) return base;
  }
  return upper;
}

function pf(val, allowZero = true) {
  const n = parseFloat(val);
  if (isNaN(n)) return undefined;
  if (!allowZero && n === 0) return undefined;
  return n;
}

function mmToM(val, fallbackMm) {
  const raw = parseFloat(val);
  const mm = (!isNaN(raw) && raw > 0) ? raw : fallbackMm;
  return mm / 1000;
}

export function buildSimulationRequest(nodes, edges, fluidProperties, totalFlow) {
  const mappedNodes = nodes.map(n => {
    const d = n.data || {};
    const type = (d.type || 'PIPE').toUpperCase();

    if (type === 'SOURCE') {
      const extFlow = pf(d.externalFlow, false);

      const ENTRANCE_K_MAP = {
        SHARP_EDGE: 0.50,
        SLIGHTLY_ROUNDING: 0.23,
        WELL_ROUNDED: 0.04,
        RE_ENTRANT: 0.80,
        PROJECTING: 0.90,
      };
      const entranceType = d.entranceType ?? 'SHARP_EDGE';
      const entranceK = ENTRANCE_K_MAP[entranceType] ?? 0.50;

      return {
        id: n.id,
        label: d.label || n.id,
        type: 'SOURCE',
        elevation: pf(d.elevation) ?? 0,
        externalFlow: extFlow ?? null,
        entranceK: entranceK,
        diameter: 0.05,
        length: 1.0,
        roughness: 0.000046,
        pumpHead: 0,
      };
    }

    if (type === 'SINK') {
      const extFlow = pf(d.externalFlow, false);
      return {
        id: n.id,
        label: d.label || n.id,
        type: 'SINK',
        elevation: pf(d.elevation) ?? 0,
        externalFlow: extFlow ?? null,
        exitK: pf(d.exitK) ?? 1.0,
        diameter: 0.05,
        length: 1.0,
        roughness: 0.000046,
        pumpHead: 0,
      };
    }

    if (type === 'JUNCTION') {
      return {
        id: n.id,
        label: d.label || n.id,
        type: 'JUNCTION',
        elevation: pf(d.elevation) ?? 0,
        externalFlow: 0,
        diameter: 0.05,
        length: 1.0,
        roughness: 0.000046,
        pumpHead: 0,
      };
    }

    const extraK = type === 'PIPE'
      ? (pf(d.extraK) ?? 0)
        + (parseInt(d.elbows90) || 0) * 0.9
        + (parseInt(d.elbows45) || 0) * 0.4
        + (parseInt(d.teeBranch) || 0) * 1.8
      : undefined;

    let kFactor;
    if (pf(d.K) != null) kFactor = parseFloat(d.K);
    else if (pf(d.kFactor) != null) kFactor = parseFloat(d.kFactor);
    else if (type === 'PIPE') kFactor = extraK ?? 0;
    else kFactor = null;

    return {
      id: n.id,
      label: d.label || n.id,
      type: type,
      elevation: pf(d.elevation) ?? 0,
      externalFlow: 0,
      diameter: mmToM(d.diameter, 100),
      diameterIn: mmToM(d.diameterIn, 150),
      diameterOut: mmToM(d.diameterOut, 100),
      length: pf(d.length) ?? (type === 'PIPE' ? 50 : 1.0),
      roughness: pf(d.roughness) ?? 0.000046,
      angle: parseInt(d.angle) || 90,
      valveType: normalizeValveType(d.valveType),
      kFactor: kFactor,
      pumpHead: type === 'PUMP' ? (pf(d.pumpHead) ?? 10) : 0,
    };
  });

  const nodeIds = new Set(nodes.map(n => n.id));
  const mappedEdges = edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

  return {
    fluid: {
      name: fluidProperties.name ?? 'Water',
      density: fluidProperties.density ?? 998.2,
      dynamicViscosity: fluidProperties.dynamicViscosity ?? 0.001002,
    },
    totalFlow,
    nodes: mappedNodes,
    edges: mappedEdges,
  };
}
