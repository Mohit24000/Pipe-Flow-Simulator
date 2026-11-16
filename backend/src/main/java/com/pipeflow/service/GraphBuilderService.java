package com.pipeflow.service;

import com.pipeflow.dto.EdgeDto;
import com.pipeflow.dto.NodeDto;
import com.pipeflow.dto.PipelineRequest;
import com.pipeflow.physics.MinorLossConstants;
import com.pipeflow.service.NetworkSolverService.PhysicsNode;
import com.pipeflow.service.NetworkSolverService.PhysicsPipe;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;


@Service
public class GraphBuilderService {
    private static final Set<String> JUNCTION_TYPES = Set.of("SOURCE", "SINK", "JUNCTION");
    private static final Set<String> ELEMENT_TYPES  = Set.of("PIPE", "TAPER", "ELBOW", "VALVE", "PUMP");









    public GraphResult build(PipelineRequest request) {
        List<NodeDto> uiNodes = request.getNodes();
        List<EdgeDto> uiEdges = request.getEdges();

        long sinkCount = uiNodes.stream()
            .filter(n -> "SINK".equalsIgnoreCase(n.getType()))
            .count();
        long sinkCountSafe = Math.max(1, sinkCount);

        Map<String, NodeDto>      nodeById  = new HashMap<>();
        Map<String, List<String>> outAdj    = new HashMap<>();
        Map<String, List<String>> inAdj     = new HashMap<>();

        for (NodeDto n : uiNodes) {
            nodeById.put(n.getId(), n);
            outAdj.put(n.getId(), new ArrayList<>());
            inAdj.put(n.getId(), new ArrayList<>());
        }
        for (EdgeDto e : uiEdges) {
            outAdj.computeIfAbsent(e.getSource(), k -> new ArrayList<>()).add(e.getTarget());
            inAdj.computeIfAbsent(e.getTarget(),  k -> new ArrayList<>()).add(e.getSource());
        }











        List<PhysicsNode> physicsNodes = new ArrayList<>();
        List<PhysicsPipe> physicsPipes = new ArrayList<>();
        List<String>      warnings     = new ArrayList<>();

        double explicitSourceFlow = uiNodes.stream()
            .filter(n -> "SOURCE".equalsIgnoreCase(n.getType()))
            .mapToDouble(n -> (n.getExternalFlow() != null && n.getExternalFlow() > 0) ? n.getExternalFlow() : 0.0)
            .sum();
        double effectiveSystemFlow = explicitSourceFlow > 0
            ? explicitSourceFlow
            : ((request.getTotalFlow() != null && request.getTotalFlow() > 0) ? request.getTotalFlow() : 0.04);

        for (NodeDto node : uiNodes) {
            if (JUNCTION_TYPES.contains(node.getType().toUpperCase())) {
                double extFlow = resolveExternalFlow(node, effectiveSystemFlow, sinkCountSafe);
                physicsNodes.add(new PhysicsNode(
                    node.getId(),
                    node.getType().toUpperCase(),
                    extFlow,
                    node.getElevation() != null ? node.getElevation() : 0.0
                ));
            }
        }



        Set<String> implicitJunctionIds = new HashSet<>();

        for (NodeDto elem : uiNodes) {
            if (!ELEMENT_TYPES.contains(elem.getType().toUpperCase())) continue;

            List<String> upstream   = inAdj.getOrDefault(elem.getId(), List.of());
            List<String> downstream = outAdj.getOrDefault(elem.getId(), List.of());

            // only the first upstream/downstream neighbour is used; warn if more are wired in
            String elemLabel = elem.getLabel() != null ? elem.getLabel() : elem.getId();
            if (upstream.size() > 1) {
                warnings.add(String.format(
                    "\u26a0 Element '%s' has %d upstream connections; only the first is used. " +
                    "Insert a JUNCTION node to handle multi-inlet connections correctly.",
                    elemLabel, upstream.size()));
            }
            if (downstream.size() > 1) {
                warnings.add(String.format(
                    "\u26a0 Element '%s' has %d downstream connections; only the first is used. " +
                    "Insert a JUNCTION node to handle multi-outlet connections correctly.",
                    elemLabel, downstream.size()));
            }

            String fromId = resolveJunctionId(upstream, elem.getId(), nodeById,
                                               true, implicitJunctionIds);

            String toId   = resolveJunctionId(downstream, elem.getId(), nodeById,
                                               false, implicitJunctionIds);

            physicsPipes.add(buildPipe(elem, fromId, toId, warnings));
        }

        for (EdgeDto edge : uiEdges) {
            NodeDto srcNode = nodeById.get(edge.getSource());
            NodeDto tgtNode = nodeById.get(edge.getTarget());
            if (srcNode != null && tgtNode != null
                    && JUNCTION_TYPES.contains(srcNode.getType().toUpperCase())
                    && JUNCTION_TYPES.contains(tgtNode.getType().toUpperCase())) {
                // direct junction-to-junction connection; insert a zero-resistance stub pipe
                PhysicsPipe directPipe = new PhysicsPipe();
                directPipe.setId(edge.getId());
                directPipe.setUiType("PIPE");
                directPipe.setFromNodeId(srcNode.getId());
                directPipe.setToNodeId(tgtNode.getId());
                directPipe.setDiameter(0.1);
                directPipe.setLength(0.01);
                directPipe.setRoughness(0.000046);
                directPipe.setKFactor(0.0);
                directPipe.setPumpHead(0.0);
                physicsPipes.add(directPipe);

                String srcLabel = srcNode.getLabel() != null ? srcNode.getLabel() : srcNode.getId();
                String tgtLabel = tgtNode.getLabel() != null ? tgtNode.getLabel() : tgtNode.getId();
                warnings.add(String.format(
                    "\u26a0 Direct connection: '%s' is wired directly to '%s' without a Pipe Segment. " +
                    "Fluid requires physical pipe geometry (length & diameter). " +
                    "An ideal zero-resistance link was substituted. Add a Pipe Segment between them for accurate results.",
                    srcLabel, tgtLabel));
            }
        }

        for (String ijId : implicitJunctionIds) {
            physicsNodes.add(new PhysicsNode(ijId, "JUNCTION", 0.0, 0.0));
        }

        // apply entrance / exit boundary loss coefficients
        Map<String, NodeDto> junctionDtoMap = new HashMap<>();
        for (NodeDto n : uiNodes) {
            if (JUNCTION_TYPES.contains(n.getType().toUpperCase())) {
                junctionDtoMap.put(n.getId(), n);
            }
        }
        for (PhysicsPipe pipe : physicsPipes) {
            NodeDto fromDto = junctionDtoMap.get(pipe.fromNodeId);
            if (fromDto != null && "SOURCE".equalsIgnoreCase(fromDto.getType())) {
                double ek = fromDto.getEntranceK() != null ? fromDto.getEntranceK() : 0.5;
                pipe.kFactor += ek;
            }
            NodeDto toDto = junctionDtoMap.get(pipe.toNodeId);
            if (toDto != null && "SINK".equalsIgnoreCase(toDto.getType())) {
                double xk = toDto.getExitK() != null ? toDto.getExitK() : 1.0;
                pipe.kFactor += xk;
            }
        }

        // topology checks — collect warnings rather than throwing hard errors
        long sourceCount = physicsNodes.stream()
            .filter(n -> n.getType().equals("SOURCE")).count();
        if (sourceCount == 0) {
            warnings.add("\u26a0 No SOURCE node found. Add an Inlet to define where flow enters the system.");
        }
        long totalSinksCount = physicsNodes.stream()
            .filter(n -> n.getType().equals("SINK")).count();
        if (totalSinksCount == 0) {
            warnings.add("\u26a0 No SINK node found. Add an Outlet to define where flow exits the system.");
        }

        // flag any junction-type nodes that have no pipe reaching them
        Set<String> connectedJunctionIds = new HashSet<>();
        for (PhysicsPipe pipe : physicsPipes) {
            connectedJunctionIds.add(pipe.fromNodeId);
            connectedJunctionIds.add(pipe.toNodeId);
        }
        for (PhysicsNode pn : physicsNodes) {
            if (!connectedJunctionIds.contains(pn.getId())) {
                String nodeLabel = nodeById.containsKey(pn.getId())
                    ? nodeById.get(pn.getId()).getLabel()
                    : pn.getId();
                warnings.add(String.format(
                    "\u26a0 '%s' (%s) is disconnected \u2014 no pipe segments reach it. " +
                    "Connect it to the network or remove it.",
                    nodeLabel != null ? nodeLabel : pn.getId(), pn.getType()));
            }
        }

        // source with no outgoing pipe
        for (PhysicsNode pn : physicsNodes) {
            if ("SOURCE".equals(pn.getType())) {
                boolean hasOutgoing = physicsPipes.stream()
                    .anyMatch(p -> p.fromNodeId.equals(pn.getId()));
                if (!hasOutgoing) {
                    String label = nodeById.containsKey(pn.getId())
                        ? nodeById.get(pn.getId()).getLabel() : pn.getId();
                    warnings.add(String.format(
                        "\u26a0 Source '%s' has no outgoing pipe. Flow cannot leave this inlet.",
                        label != null ? label : pn.getId()));
                }
            }
        }





        // source with more than one outgoing connection
        for (NodeDto node : uiNodes) {
            if ("SOURCE".equalsIgnoreCase(node.getType())) {
                List<String> targets = outAdj.getOrDefault(node.getId(), List.of());
                if (targets.size() > 1) {
                    String label = node.getLabel() != null ? node.getLabel() : node.getId();
                    warnings.add(String.format(
                        "\u26a0 Source '%s' has %d outgoing connections (only 1 allowed). " +
                        "Flow cannot split directly at an inlet. Insert a JUNCTION node to distribute flow into branches.",
                        label, targets.size()));
                }
            }
        }

        // sink with no incoming pipe
        for (PhysicsNode pn : physicsNodes) {
            if ("SINK".equals(pn.getType())) {
                boolean hasIncoming = physicsPipes.stream()
                    .anyMatch(p -> p.toNodeId.equals(pn.getId()));
                if (!hasIncoming) {
                    String label = nodeById.containsKey(pn.getId())
                        ? nodeById.get(pn.getId()).getLabel() : pn.getId();
                    warnings.add(String.format(
                        "\u26a0 Sink '%s' has no incoming pipe. Flow cannot reach this outlet.",
                        label != null ? label : pn.getId()));
                }
            }
        }

        // sink with more than one incoming connection
        for (NodeDto node : uiNodes) {
            if ("SINK".equalsIgnoreCase(node.getType())) {
                List<String> sources = inAdj.getOrDefault(node.getId(), List.of());
                if (sources.size() > 1) {
                    String label = node.getLabel() != null ? node.getLabel() : node.getId();
                    warnings.add(String.format(
                        "\u26a0 Sink '%s' has %d incoming connections (only 1 allowed). " +
                        "Flow cannot merge directly into an outlet. Insert a JUNCTION node to combine branches before the outlet.",
                        label, sources.size()));
                }
            }
        }

        // elements with a floating (unconnected) inlet or outlet
        for (String ijId : implicitJunctionIds) {
            if (ijId.startsWith("implicit_boundary_")) {
                String elemPart = ijId.replace("implicit_boundary_", "");
                boolean isIn = elemPart.endsWith("_in");
                String elemId = isIn
                    ? elemPart.substring(0, elemPart.length() - 3)
                    : elemPart.substring(0, elemPart.length() - 4);
                String label = nodeById.containsKey(elemId)
                    ? nodeById.get(elemId).getLabel() : elemId;
                String side = isIn ? "inlet (upstream)" : "outlet (downstream)";
                warnings.add(String.format(
                    "\u26a0 Element '%s' has a floating %s \u2014 nothing is connected to its %s side. " +
                    "Connect it to a pipe or junction.",
                    label != null ? label : elemId, side, isIn ? "input" : "output"));
            }
        }

        // source with zero flow and no global flow rate set
        for (NodeDto n : uiNodes) {
            if ("SOURCE".equalsIgnoreCase(n.getType())) {
                Double ef = n.getExternalFlow();
                if ((ef == null || ef <= 0) && request.getTotalFlow() <= 0) {
                    String label = n.getLabel() != null ? n.getLabel() : n.getId();
                    warnings.add(String.format(
                        "\u26a0 Source '%s' has zero inlet flow and no global flow rate is set. " +
                        "Set a flow rate (Q) on the source or the global setting.",
                        label));
                }
            }
        }

        return new GraphResult(physicsNodes, physicsPipes, warnings);
    }

    private String resolveJunctionId(List<String> neighbours, String elemId,
                                      Map<String, NodeDto> nodeById,
                                      boolean isUpstream,
                                      Set<String> implicitJunctionIds) {
        if (neighbours.isEmpty()) {
            String id = "implicit_boundary_" + elemId + (isUpstream ? "_in" : "_out");
            implicitJunctionIds.add(id);
            return id;
        }
        String neighbourId = neighbours.get(0);
        NodeDto neighbour  = nodeById.get(neighbourId);

        if (neighbour == null || JUNCTION_TYPES.contains(neighbour.getType().toUpperCase())) {
            return neighbourId;
        }

        // element-to-element connection; synthesise an implicit junction node between them
        String ijId = isUpstream
            ? "implicit_" + neighbourId + "_" + elemId
            : "implicit_" + elemId + "_" + neighbourId;
        implicitJunctionIds.add(ijId);
        return ijId;
    }

    private PhysicsPipe buildPipe(NodeDto elem, String fromId, String toId, List<String> warnings) {
        PhysicsPipe p = new PhysicsPipe();
        p.setId(elem.getId());
        p.setUiType(elem.getType().toUpperCase());
        p.setFromNodeId(fromId);
        p.setToNodeId(toId);

        switch (elem.getType().toUpperCase()) {

            case "PIPE" -> {
                double d = nvl(elem.getDiameter(), 0.0);
                if (d <= 0) {
                    warnings.add(String.format(
                        "PIPE '%s' has invalid diameter (%.4f m); defaulting to 0.05 m.",
                        elem.getId(), d));
                    d = 0.05;
                }
                p.setDiameter(d);
                p.setLength(nvlPositive(elem.getLength(), 10.0));
                p.setRoughness(nvl(elem.getRoughness(), 0.000046));
                p.setKFactor(nvl(elem.getKFactor(), 0.0));
                p.setPumpHead(0.0);
            }

            case "ELBOW" -> {
                double d   = nvl(elem.getDiameter(), 0.05);
                int angle  = elem.getAngle() != null ? elem.getAngle() : 90;
                p.setDiameter(d);
                p.setLength(Math.PI * d * angle / 360.0); // arc length of the bend
                p.setRoughness(nvl(elem.getRoughness(), 0.000046));
                double kf = elem.getKFactor() != null
                    ? elem.getKFactor()
                    : MinorLossConstants.getElbowK(angle);
                p.setKFactor(kf);
                p.setPumpHead(0.0);
            }

            case "PUMP" -> {
                double d = nvl(elem.getDiameter(), 0.05);
                p.setDiameter(d);
                p.setLength(d);
                p.setRoughness(0.0);
                p.setKFactor(0.0);
                p.setPumpHead(nvlPositive(elem.getPumpHead(), 10.0));
            }

            default -> {
                p.setDiameter(0.05);
                p.setLength(1.0);
                p.setRoughness(0.000046);
                p.setKFactor(0.0);
                p.setPumpHead(0.0);
            }
        }

        return p;
    }

    private double resolveExternalFlow(NodeDto node, double effectiveFlow, long sinkCount) {
        return switch (node.getType().toUpperCase()) {
            case "SOURCE" -> {
                Double ef = node.getExternalFlow();
                yield (ef != null && ef > 0) ? ef : effectiveFlow;
            }
            case "SINK" -> {
                Double ef = node.getExternalFlow();
                yield (ef != null && ef > 0) ? -ef : -(effectiveFlow / sinkCount);
            }
            default -> 0.0;
        };
    }




















    // returns val if val > 0, otherwise returns def
    private double nvl(Double val, double def) {
        return (val != null && val > 0) ? val : def;
    }

    // same as nvl but also ensures def is positive
    private double nvlPositive(Double val, double def) {
        return (val != null && val > 0) ? val : (def > 0 ? def : 1.0);
    }

    public record GraphResult(
        List<PhysicsNode> nodes,
        List<PhysicsPipe> pipes,
        List<String> warnings
    ) {}
}
