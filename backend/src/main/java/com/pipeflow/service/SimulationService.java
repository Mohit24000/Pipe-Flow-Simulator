package com.pipeflow.service;

import com.pipeflow.dto.PipelineRequest;
import com.pipeflow.dto.SegmentResult;
import com.pipeflow.dto.SimulationResult;
import com.pipeflow.service.GraphBuilderService.GraphResult;
import com.pipeflow.service.NetworkSolverService.PhysicsNode;
import com.pipeflow.service.NetworkSolverService.PhysicsPipe;
import com.pipeflow.service.NetworkSolverService.SolverResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private static final double G = 9.81;
    private static final double WARN_VELOCITY = 3.0;
    private static final double WARN_HEAD_LOSS_PER_M = 5.0;

    private final GraphBuilderService graphBuilder;
    private final NetworkSolverService networkSolver;

    public SimulationService(GraphBuilderService graphBuilder, NetworkSolverService networkSolver) {
        this.graphBuilder = graphBuilder;
        this.networkSolver = networkSolver;
    }

    public SimulationResult simulate(PipelineRequest request) {
        log.debug("Starting simulation for {} nodes, {} edges",
            request.getNodes().size(), request.getEdges().size());

        GraphResult graph = graphBuilder.build(request);
        List<String> warnings = new ArrayList<>(graph.warnings());

        if (graph.pipes().isEmpty()) {
            SimulationResult emptyRes = new SimulationResult();
            emptyRes.setWarnings(List.of("No pipe elements found. Add pipes to the canvas."));
            emptyRes.setSegments(List.of());
            emptyRes.setConverged(true);
            return emptyRes;
        }

        SolverResult solver = networkSolver.solve(graph.nodes(), graph.pipes(), request.getFluid());
        log.debug("Solver: {} iterations, converged={}", solver.getIterations(), solver.isConverged());

        if (!solver.isConverged()) {
            warnings.add("Hardy-Cross did not fully converge. Results are approximate.");
        }

        List<SegmentResult> segments = new ArrayList<>();
        double totalMajor = 0;
        double totalMinor = 0;
        double totalPump = 0;

        for (PhysicsPipe pipe : graph.pipes()) {
            SegmentResult seg = buildSegmentResult(pipe, request.getFluid().getDensity());
            segments.add(seg);
            totalMajor += pipe.getMajorLoss();
            totalMinor += pipe.getMinorLoss();
            totalPump += pipe.getPumpHead();

            if (pipe.getVelocity() > WARN_VELOCITY) {
                warnings.add(String.format("High velocity in %s: %.2f m/s (>%.0f m/s recommended)",
                    pipe.getId(), pipe.getVelocity(), WARN_VELOCITY));
            }

            if (pipe.getLength() > 0) {
                double hPerM = (pipe.getMajorLoss() + pipe.getMinorLoss()) / pipe.getLength();
                if (hPerM > WARN_HEAD_LOSS_PER_M) {
                    warnings.add(String.format(
                        "High head loss in %s: %.2f m/m (>%.0f m/m — consider larger diameter)",
                        pipe.getId(), hPerM, WARN_HEAD_LOSS_PER_M));
                }
            }
        }

        double totalHeadLoss = totalMajor + totalMinor;
        double netLoss = totalHeadLoss - totalPump;

        double actualHeadLoss = computeActualSystemHeadLoss(graph.nodes(), graph.pipes());
        if (actualHeadLoss <= 0 && totalHeadLoss > 0) {
            actualHeadLoss = totalHeadLoss;
        }

        SimulationResult res = new SimulationResult();
        res.setActualHeadLoss(round(actualHeadLoss));
        res.setTotalHeadLoss(round(totalHeadLoss));
        res.setTotalMajorLoss(round(totalMajor));
        res.setTotalMinorLoss(round(totalMinor));
        res.setTotalPumpHead(round(totalPump));
        res.setNetSystemHeadLoss(round(netLoss));

        boolean hasPump = graph.pipes().stream().anyMatch(p -> p.getPumpHead() > 0);
        res.setRequiredPumpHead(hasPump ? round(Math.max(0, actualHeadLoss - totalPump)) : 0.0);

        res.setActualPressureDropPa(round(request.getFluid().getDensity() * G * actualHeadLoss));
        res.setTotalPressureDropPa(round(request.getFluid().getDensity() * G * totalHeadLoss));
        res.setHardyCrossIterations(solver.getIterations());
        res.setConverged(solver.isConverged());
        res.setSegments(segments);
        res.setWarnings(warnings);
        return res;
    }

    private double computeActualSystemHeadLoss(List<PhysicsNode> nodes, List<PhysicsPipe> pipes) {
        if (pipes.isEmpty() || nodes.isEmpty()) return 0.0;

        Set<String> sinkIds = new HashSet<>();
        List<String> sourceIds = new ArrayList<>();

        for (PhysicsNode n : nodes) {
            if ("SINK".equalsIgnoreCase(n.getType())) {
                sinkIds.add(n.getId());
            } else if ("SOURCE".equalsIgnoreCase(n.getType())) {
                sourceIds.add(n.getId());
            }
        }

        if (sourceIds.isEmpty() || sinkIds.isEmpty()) {
            return 0.0;
        }

        Map<String, List<PipeFlowEdge>> adj = new HashMap<>();
        for (PhysicsPipe pipe : pipes) {
            double flow = pipe.getFlow();
            double loss = pipe.getMajorLoss() + pipe.getMinorLoss();
            if (flow > 1e-6) {
                adj.computeIfAbsent(pipe.getFromNodeId(), k -> new ArrayList<>())
                   .add(new PipeFlowEdge(pipe.getToNodeId(), loss));
            } else if (flow < -1e-6) {
                adj.computeIfAbsent(pipe.getToNodeId(), k -> new ArrayList<>())
                   .add(new PipeFlowEdge(pipe.getFromNodeId(), loss));
            } else {
                adj.computeIfAbsent(pipe.getFromNodeId(), k -> new ArrayList<>())
                   .add(new PipeFlowEdge(pipe.getToNodeId(), loss));
            }
        }

        for (String sourceId : sourceIds) {
            Queue<NodeLossPair> queue = new LinkedList<>();
            Set<String> visited = new HashSet<>();
            queue.add(new NodeLossPair(sourceId, 0.0));
            visited.add(sourceId);

            while (!queue.isEmpty()) {
                NodeLossPair curr = queue.poll();
                if (sinkIds.contains(curr.nodeId)) {
                    return curr.loss;
                }
                for (PipeFlowEdge edge : adj.getOrDefault(curr.nodeId, List.of())) {
                    if (!visited.contains(edge.targetId)) {
                        visited.add(edge.targetId);
                        queue.add(new NodeLossPair(edge.targetId, curr.loss + edge.loss));
                    }
                }
            }
        }

        return 0.0;
    }

    private record PipeFlowEdge(String targetId, double loss) {}
    private record NodeLossPair(String nodeId, double loss) {}

    private SegmentResult buildSegmentResult(PhysicsPipe pipe, double density) {
        double resistiveLoss = pipe.getMajorLoss() + pipe.getMinorLoss();
        double hPerMetre = (pipe.getLength() > 0) ? resistiveLoss / pipe.getLength() : 0;
        double severity = Math.min(1.0, hPerMetre / 5.0);
        String band = hPerMetre < 0.5 ? "LOW"
                    : hPerMetre < 1.5 ? "MEDIUM"
                    : hPerMetre < 3.0 ? "HIGH"
                    : "CRITICAL";

        SegmentResult sr = new SegmentResult();
        sr.setNodeId(pipe.getId());
        sr.setLabel(pipe.getUiType() + " (D=" + fmt(pipe.getDiameter() * 1000) + " mm)");
        sr.setType(pipe.getUiType());
        sr.setFlowRate(round(Math.abs(pipe.getFlow())));
        sr.setVelocity(round(pipe.getVelocity()));
        sr.setReynoldsNumber(round(pipe.getReynoldsNumber()));
        sr.setFlowType(pipe.getFlowType());
        sr.setFrictionFactor(round4(pipe.getFrictionFactor()));
        sr.setMajorLoss(round(pipe.getMajorLoss()));
        sr.setMinorLoss(round(pipe.getMinorLoss()));
        sr.setPumpHead(round(pipe.getPumpHead()));
        sr.setNetHeadLoss(round(pipe.getNetHeadLoss()));
        sr.setPressureDropPa(round(pipe.getPressureDropPa()));
        sr.setDiameter(pipe.getDiameter());
        sr.setLength(round(pipe.getLength()));
        sr.setSeverityScore(round4(severity));
        sr.setSeverityBand(band);
        return sr;
    }

    private double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }

    private double round4(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }

    private String fmt(double mm) {
        return String.format("%.1f", mm);
    }
}
