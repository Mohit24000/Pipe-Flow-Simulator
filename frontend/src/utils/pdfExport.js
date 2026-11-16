import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


export function exportSimulationToPDF(simulationResult, fluidProperties, totalFlow) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Pipe Flow Simulation Report', 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  // summary table
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Network Summary', 14, 45);

  const actualHl = (simulationResult.actualHeadLoss != null && simulationResult.actualHeadLoss > 0)
    ? simulationResult.actualHeadLoss
    : (simulationResult.totalHeadLoss ?? 0);
  const actualDp = (simulationResult.actualPressureDropPa != null && simulationResult.actualPressureDropPa > 0)
    ? simulationResult.actualPressureDropPa
    : (simulationResult.totalPressureDropPa ?? 0);

  const summaryData = [
    ['Actual Head Loss (Path)',      `${Number(actualHl).toFixed(3)} m`],
    ['Summed Head Loss (Segments)',  `${Number(simulationResult.totalHeadLoss ?? 0).toFixed(3)} m`],
    ['Actual System Pressure Drop',  `${Number(actualDp).toLocaleString(undefined, { maximumFractionDigits: 0 })} Pa`],
    ['Total Flow',                   `${totalFlow} m³/s`],
    ['Fluid',                        `${fluidProperties.name} (ρ=${fluidProperties.density} kg/m³, μ=${fluidProperties.dynamicViscosity} Pa·s)`],
    ['Solver Converged',             simulationResult.converged ? 'Yes' : 'No'],
    ['Hardy-Cross Iterations',       String(simulationResult.hardyCrossIterations ?? 0)],
  ];
  if ((simulationResult.requiredPumpHead ?? 0) > 0) {
    summaryData.push(['Required Pump Head', `${simulationResult.requiredPumpHead} m`]);
  }


  const summaryResult = autoTable(doc, {
    startY: 50,
    head: [['Parameter', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 120, 212] },
  });

  let currentY = (summaryResult?.finalY ?? 100) + 10;

  if (simulationResult.warnings?.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(180, 20, 20);
    doc.text('Warnings', 14, currentY);
    doc.setFontSize(9);
    doc.setTextColor(140, 30, 30);
    simulationResult.warnings.forEach((w, i) => {
      doc.text(`• ${w}`, 14, currentY + 8 + i * 6);
    });
    currentY += 8 + simulationResult.warnings.length * 6 + 4;
  }

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Pipe Segment Details', 14, currentY);

  const fmt = (v, d = 3) => (v != null ? Number(v).toFixed(d) : '—');

  const segmentBody = (simulationResult.segments ?? []).map(seg => [
    seg.nodeId   ?? '—',
    seg.type     ?? '—',
    fmt(seg.diameter, 3),
    fmt(seg.length, 1),
    fmt(seg.velocity, 2),
    seg.flowType ?? '—',
    fmt(seg.majorLoss ?? seg.hfMajor, 4),
    fmt(seg.minorLoss ?? seg.hLMinor, 4),
    fmt(seg.netHeadLoss, 4),
  ]);
  autoTable(doc, {
    startY: currentY + 5,
    head: [['ID', 'Type', 'D (m)', 'L (m)', 'v (m/s)', 'Regime', 'hf Major', 'hL Minor', 'Net Loss (m)']],
    body: segmentBody,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105] },
    styles: { fontSize: 8 },
  });

  doc.save('PipeFlow_Simulation_Report.pdf');
}
