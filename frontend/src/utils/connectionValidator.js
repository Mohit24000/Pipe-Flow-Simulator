
export function validateConnection(connection, nodes, edges) {
  if (!connection.source || !connection.target) {
    return { valid: false, reason: 'Invalid connection endpoints.' };
  }

  if (connection.source === connection.target) {
    return {
      valid: false,
      reason: 'Cannot connect an element to itself.',
      hint: 'Pipes must connect two distinct components.',
    };
  }

  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Source or target node not found.' };
  }

  const sourceType = (sourceNode.data?.type || '').toUpperCase();
  const targetType = (targetNode.data?.type || '').toUpperCase();
  const sourceLabel = sourceNode.data?.label || sourceNode.id;
  const targetLabel = targetNode.data?.label || targetNode.id;

  // block duplicate handle pairs
  const duplicate = edges.some(
    e =>
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );
  if (duplicate) {
    return {
      valid: false,
      reason: `Connection between '${sourceLabel}' and '${targetLabel}' on these ports already exists.`,
      hint: 'Only one connection per port pair is allowed.',
    };
  }

  if (sourceType === 'SOURCE' && targetType === 'SINK') {
    return {
      valid: false,
      reason: `Cannot connect Source '${sourceLabel}' directly to Sink '${targetLabel}'.`,
      hint: 'Fluid simulation requires pipe segments with length and diameter to calculate friction and head loss.',
    };
  }

  if (sourceType === 'SOURCE') {
    const outEdges = edges.filter(e => e.source === connection.source);
    if (outEdges.length >= 1) {
      return {
        valid: false,
        reason: `Inlet '${sourceLabel}' already has an outgoing connection.`,
        hint: 'A single inlet cannot split flow directly into multiple pipes. Place a Junction node to distribute flow into branches.',
      };
    }
  }

  if (targetType === 'SINK') {
    const inEdges = edges.filter(e => e.target === connection.target);
    if (inEdges.length >= 1) {
      return {
        valid: false,
        reason: `Outlet '${targetLabel}' already has an incoming connection.`,
        hint: 'A single outlet cannot merge flow directly from multiple pipes. Place a Junction node to combine branches before the outlet.',
      };
    }
  }

  const SINGLE_PORT_TYPES = ['PIPE', 'ELBOW', 'PUMP', 'VALVE', 'TAPER'];

  // don't let someone wire into an outlet handle
  if (SINGLE_PORT_TYPES.includes(targetType) && connection.targetHandle === 'out') {
    return {
      valid: false,
      reason: `Cannot connect incoming flow to the outlet port of '${targetLabel}'.`,
      hint: targetType === 'ELBOW'
        ? `Flow must enter through the inlet port. Rotate the elbow to align with incoming flow.`
        : `Flow must enter through an inlet port.`,
    };
  }

  // don't let someone drag out from an inlet handle
  if (SINGLE_PORT_TYPES.includes(sourceType) && connection.sourceHandle === 'in') {
    return {
      valid: false,
      reason: `Cannot connect outgoing flow from the inlet port of '${sourceLabel}'.`,
      hint: `Flow must exit through an outlet port.`,
    };
  }

  if (SINGLE_PORT_TYPES.includes(targetType)) {
    const handleAlreadyUsed = edges.some(
      e => e.target === connection.target && (e.targetHandle === connection.targetHandle || e.targetHandle === 'in')
    );
    if (handleAlreadyUsed) {
      return {
        valid: false,
        reason: `The inlet of '${targetLabel}' is already connected.`,
        hint: 'Delete the existing connection first to rewire it, or insert a Junction node to merge multiple incoming flows.',
      };
    }
  }

  if (SINGLE_PORT_TYPES.includes(sourceType)) {
    const handleAlreadyUsed = edges.some(
      e => e.source === connection.source && (e.sourceHandle === connection.sourceHandle || e.sourceHandle === 'out')
    );
    if (handleAlreadyUsed) {
      return {
        valid: false,
        reason: `The outlet of '${sourceLabel}' is already connected.`,
        hint: 'Delete the existing connection first to rewire it, or insert a Junction node to split flow into multiple branches.',
      };
    }
  }

  return { valid: true };
}

// walks all nodes and builds up degree counts, then flags anything that looks broken
export function checkNetworkTopology(nodes, edges) {
  const warnings = [];

  const inDegree = new Map();
  const outDegree = new Map();
  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });
  edges.forEach(e => {
    if (inDegree.has(e.target))  inDegree.set(e.target,  inDegree.get(e.target)  + 1);
    if (outDegree.has(e.source)) outDegree.set(e.source, outDegree.get(e.source) + 1);
  });

  const ELEMENT_TYPES = ['PIPE', 'ELBOW', 'PUMP', 'VALVE', 'TAPER'];

  nodes.forEach(node => {
    const type     = (node.data?.type || '').toUpperCase();
    const label    = node.data?.label || node.id;
    const inCount  = inDegree.get(node.id)  || 0;
    const outCount = outDegree.get(node.id) || 0;

    if (type === 'SOURCE') {
      if (outCount > 1) {
        warnings.push({
          id: `src-multi-${node.id}`,
          title: `Multiple Connections from Inlet '${label}'`,
          message: `Inlet '${label}' has ${outCount} outgoing connections (maximum 1). Flow cannot split at an inlet without a Junction.`,
          hint: 'Insert a Junction node between this inlet and the branches.',
          severity: 'error',
        });
      } else if (outCount === 0) {
        warnings.push({
          id: `src-empty-${node.id}`,
          title: `Inlet '${label}' Unconnected`,
          message: `Inlet '${label}' is not connected to any downstream pipe.`,
          hint: 'Drag a connection from this inlet to your first pipe or component.',
          severity: 'warning',
        });
      }
    } else if (type === 'SINK') {
      if (inCount > 1) {
        warnings.push({
          id: `sink-multi-${node.id}`,
          title: `Multiple Connections to Outlet '${label}'`,
          message: `Outlet '${label}' has ${inCount} incoming connections (maximum 1). Flow cannot merge directly at an outlet without a Junction.`,
          hint: 'Insert a Junction node to combine branches before the outlet.',
          severity: 'error',
        });
      } else if (inCount === 0) {
        warnings.push({
          id: `sink-empty-${node.id}`,
          title: `Outlet '${label}' Unconnected`,
          message: `Outlet '${label}' is not receiving any pipe flow.`,
          hint: 'Connect the final pipe segment to this outlet.',
          severity: 'warning',
        });
      }
    } else if (ELEMENT_TYPES.includes(type)) {
      if (inCount > 1) {
        warnings.push({
          id: `elem-multi-in-${node.id}`,
          title: `Multiple Inlets on '${label}'`,
          message: `'${label}' has ${inCount} incoming connections. Pipe elements only have 1 inlet.`,
          hint: 'Use a Junction node to merge multiple lines.',
          severity: 'error',
        });
      }
      if (outCount > 1) {
        warnings.push({
          id: `elem-multi-out-${node.id}`,
          title: `Multiple Outlets on '${label}'`,
          message: `'${label}' has ${outCount} outgoing connections. Pipe elements only have 1 outlet.`,
          hint: 'Use a Junction node to split flow into multiple branches.',
          severity: 'error',
        });
      }
      if (inCount === 0 && outCount === 0) {
        warnings.push({
          id: `elem-isolated-${node.id}`,
          title: `'${label}' is Disconnected`,
          message: `'${label}' is not connected to any other element.`,
          hint: 'Connect it to upstream and downstream components or delete it.',
          severity: 'warning',
        });
      }
    }
  });

  return warnings;
}
