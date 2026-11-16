package com.pipeflow.service;

import com.pipeflow.dto.FluidPropertiesDto;
import com.pipeflow.physics.FrictionFactorSolver;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NetworkSolverService {

    private static final double G = 9.81;
    private static final int MAX_ITERATIONS = 1000;
    private static final double CONV_TOLERANCE = 1e-7;
    private static final double MIN_FLOW = 1e-10;
    private static final double SEED_FLOW = 1e-6;

    public SolverResult solve(List<PhysicsNode> nodes,
                               List<PhysicsPipe> pipes,
                               FluidPropertiesDto fluid) {

        if (pipes.isEmpty()) {
            return new SolverResult(0, true);
        }

        Map<String, List<PipeConn>> adj = buildAdjacency(nodes, pipes);

        PhysicsNode source = findSource(nodes);
        BfsResult bfs = bfsSpanningTree(source.id, adj);

        assignInitialFlows(nodes, pipes, adj, bfs, source);

        List<List<LoopPipe>> loops = findFundamentalLoops(pipes, adj, bfs.treePipeIds);

        int iterations = 0;
        boolean converged = true;
        if (!loops.isEmpty()) {
            HardyCrossResult hcr = hardyCross(pipes, loops, fluid);
            iterations = hcr.iterations;
            converged = hcr.converged;
        }

        for (PhysicsPipe pipe : pipes) {
            computePipeResults(pipe, fluid);
        }

        return new SolverResult(iterations, converged);
    }

    private Map<String, List<PipeConn>> buildAdjacency(List<PhysicsNode> nodes,
                                                        List<PhysicsPipe> pipes) {
        Map<String, List<PipeConn>> adj = new HashMap<>();
        for (PhysicsNode n : nodes) adj.put(n.id, new ArrayList<>());

        for (PhysicsPipe p : pipes) {
            adj.computeIfAbsent(p.fromNodeId, k -> new ArrayList<>())
               .add(new PipeConn(p.toNodeId, p, +1));
            adj.computeIfAbsent(p.toNodeId, k -> new ArrayList<>())
               .add(new PipeConn(p.fromNodeId, p, -1));
        }
        return adj;
    }

    private BfsResult bfsSpanningTree(String sourceId, Map<String, List<PipeConn>> adj) {
        Set<String> visited = new LinkedHashSet<>();
        Set<String> treePipes = new HashSet<>();
        Map<String, String> parent = new HashMap<>();
        Map<String, PhysicsPipe> parentPipe = new HashMap<>();
        List<String> bfsOrder = new ArrayList<>();

        Queue<String> queue = new LinkedList<>();
        visited.add(sourceId);
        queue.add(sourceId);
        bfsOrder.add(sourceId);
        while (!queue.isEmpty()) {
            String curr = queue.poll();
            for (PipeConn conn : adj.getOrDefault(curr, List.of())) {
                if (!visited.contains(conn.neighborId)) {
                    visited.add(conn.neighborId);
                    treePipes.add(conn.pipe.id);
                    parent.put(conn.neighborId, curr);
                    parentPipe.put(conn.neighborId, conn.pipe);
                    queue.add(conn.neighborId);
                    bfsOrder.add(conn.neighborId);
                }
            }
        }
        return new BfsResult(treePipes, parent, parentPipe, bfsOrder, visited);
    }

    private void assignInitialFlows(List<PhysicsNode> nodes,
                                    List<PhysicsPipe> pipes,
                                    Map<String, List<PipeConn>> adj,
                                    BfsResult bfs,
                                    PhysicsNode source) {

        for (PhysicsPipe p : pipes) {
            p.flow = bfs.treePipeIds.contains(p.id) ? 0.0 : SEED_FLOW;
        }

        Map<String, Double> netDemand = new HashMap<>();
        for (PhysicsNode n : nodes) {
            netDemand.put(n.id, -n.externalFlow);
        }

        List<String> order = bfs.bfsOrder;
        for (int i = order.size() - 1; i >= 0; i--) {
            String curr = order.get(i);
            if (curr.equals(source.id)) continue;

            String pNode = bfs.parent.get(curr);
            PhysicsPipe pPipe = bfs.parentPipe.get(curr);
            if (pNode == null || pPipe == null) continue;

            double neededFlow = netDemand.getOrDefault(curr, 0.0);

            if (pPipe.fromNodeId.equals(pNode)) {
                pPipe.flow = neededFlow;
            } else {
                pPipe.flow = -neededFlow;
            }

            netDemand.put(pNode, netDemand.getOrDefault(pNode, 0.0) + neededFlow);
        }

        for (PhysicsPipe p : pipes) {
            if (Math.abs(p.flow) < MIN_FLOW) {
                p.flow = SEED_FLOW;
            }
        }
    }

    private List<List<LoopPipe>> findFundamentalLoops(List<PhysicsPipe> pipes,
                                                       Map<String, List<PipeConn>> adj,
                                                       Set<String> treePipeIds) {
        List<List<LoopPipe>> loops = new ArrayList<>();

        for (PhysicsPipe chord : pipes) {
            if (treePipeIds.contains(chord.id)) continue;

            List<LoopPipe> treePath = findTreePath(chord.fromNodeId, chord.toNodeId,
                                                    adj, treePipeIds);
            if (treePath == null) continue;

            List<LoopPipe> loop = new ArrayList<>(treePath);
            loop.add(new LoopPipe(chord, -1));
            loops.add(loop);
        }
        return loops;
    }

    private List<LoopPipe> findTreePath(String start, String end,
                                        Map<String, List<PipeConn>> adj,
                                        Set<String> treePipeIds) {
        Map<String, PipeConn> parentMap = new HashMap<>();
        parentMap.put(start, null);
        Queue<String> queue = new LinkedList<>();
        queue.add(start);

        while (!queue.isEmpty()) {
            String curr = queue.poll();
            if (curr.equals(end)) break;
            for (PipeConn conn : adj.getOrDefault(curr, List.of())) {
                if (!treePipeIds.contains(conn.pipe.id)) continue;
                if (parentMap.containsKey(conn.neighborId)) continue;
                parentMap.put(conn.neighborId, new PipeConn(curr, conn.pipe, conn.sign));
                queue.add(conn.neighborId);
            }
        }

        if (!parentMap.containsKey(end)) return null;

        List<LoopPipe> path = new ArrayList<>();
        String curr = end;
        while (!curr.equals(start)) {
            PipeConn pc = parentMap.get(curr);
            path.add(new LoopPipe(pc.pipe, pc.sign));
            curr = pc.neighborId;
        }
        Collections.reverse(path);
        return path;
    }

    private HardyCrossResult hardyCross(List<PhysicsPipe> pipes,
                                         List<List<LoopPipe>> loops,
                                         FluidPropertiesDto fluid) {
        int iter;
        for (iter = 1; iter <= MAX_ITERATIONS; iter++) {
            double maxCorr = 0;

            for (List<LoopPipe> loop : loops) {
                double hSum = 0;
                double denom = 0;

                for (LoopPipe lp : loop) {
                    double Q = lp.pipe.flow;
                    double absQ = Math.abs(Q);
                    int flowSign = (Q >= 0) ? +1 : -1;

                    double hf = frictionHeadLoss(lp.pipe, fluid);
                    double hm = minorHeadLoss(lp.pipe, fluid);
                    double hpump = lp.pipe.pumpHead;

                    double hResist = flowSign * (hf + hm);
                    double hNet = hResist - flowSign * hpump;

                    hSum += lp.sign * hNet;

                    if (absQ > MIN_FLOW) {
                        denom += 2.0 * (hf + hm) / absQ;
                    }
                }

                if (denom < 1e-12) continue;

                double deltaQ = -hSum / denom;
                maxCorr = Math.max(maxCorr, Math.abs(deltaQ));

                for (LoopPipe lp : loop) {
                    lp.pipe.flow += lp.sign * deltaQ;
                }
            }

            if (maxCorr < CONV_TOLERANCE) {
                return new HardyCrossResult(iter, true);
            }
        }
        return new HardyCrossResult(MAX_ITERATIONS, false);
    }

    double frictionHeadLoss(PhysicsPipe pipe, FluidPropertiesDto fluid) {
        double absQ = Math.abs(pipe.flow);
        if (absQ < MIN_FLOW || pipe.diameter <= 0) return 0;
        double A = Math.PI * pipe.diameter * pipe.diameter / 4.0;
        double v = absQ / A;
        double re = fluid.getDensity() * v * pipe.diameter / fluid.getDynamicViscosity();
        double f = FrictionFactorSolver.solve(re, pipe.roughness / pipe.diameter);
        return f * (pipe.length / pipe.diameter) * (v * v / (2.0 * G));
    }

    double minorHeadLoss(PhysicsPipe pipe, FluidPropertiesDto fluid) {
        double absQ = Math.abs(pipe.flow);
        if (absQ < MIN_FLOW || pipe.diameter <= 0) return 0;
        double A = Math.PI * pipe.diameter * pipe.diameter / 4.0;
        double v = absQ / A;
        return pipe.kFactor * (v * v / (2.0 * G));
    }

    private void computePipeResults(PhysicsPipe pipe, FluidPropertiesDto fluid) {
        double absQ = Math.abs(pipe.flow);
        if (absQ < MIN_FLOW || pipe.diameter <= 0) {
            pipe.velocity = 0;
            pipe.reynoldsNumber = 0;
            pipe.flowType = "LAMINAR";
            pipe.frictionFactor = 0;
            pipe.majorLoss = 0;
            pipe.minorLoss = 0;
            pipe.netHeadLoss = 0;
            pipe.pressureDropPa = 0;
            return;
        }

        double A = Math.PI * pipe.diameter * pipe.diameter / 4.0;
        double v = absQ / A;
        double re = fluid.getDensity() * v * pipe.diameter / fluid.getDynamicViscosity();
        double f = FrictionFactorSolver.solve(re, pipe.roughness / pipe.diameter);

        double hf = f * (pipe.length / pipe.diameter) * (v * v / (2.0 * G));
        double hm = pipe.kFactor * (v * v / (2.0 * G));
        double hNet = hf + hm - pipe.pumpHead;

        pipe.velocity = v;
        pipe.reynoldsNumber = re;
        pipe.flowType = re < 2300 ? "LAMINAR" : re < 4000 ? "TRANSITIONAL" : "TURBULENT";
        pipe.frictionFactor = f;
        pipe.majorLoss = hf;
        pipe.minorLoss = hm;
        pipe.netHeadLoss = hNet;
        pipe.pressureDropPa = fluid.getDensity() * G * (hf + hm);
    }

    private PhysicsNode findSource(List<PhysicsNode> nodes) {
        return nodes.stream()
            .filter(n -> "SOURCE".equals(n.type) && n.externalFlow > 0)
            .findFirst()
            .orElseGet(() -> nodes.stream()
                .filter(n -> n.externalFlow > 0)
                .findFirst()
                .orElse(nodes.get(0)));
    }

    public static class PhysicsNode {
        public String id;
        public String type;
        public double externalFlow;
        public double elevation;

        public PhysicsNode(String id, String type, double externalFlow, double elevation) {
            this.id = id;
            this.type = type;
            this.externalFlow = externalFlow;
            this.elevation = elevation;
        }

        public String getId() { return id; }
        public String getType() { return type; }
        public double getExternalFlow() { return externalFlow; }
    }

    public static class PhysicsPipe {
        public String id;
        public String uiType;
        public String fromNodeId;
        public String toNodeId;
        public double diameter;
        public double length;
        public double roughness;
        public double kFactor;
        public double pumpHead;

        public double flow;

        public double velocity;
        public double reynoldsNumber;
        public String flowType;
        public double frictionFactor;
        public double majorLoss;
        public double minorLoss;
        public double netHeadLoss;
        public double pressureDropPa;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUiType() { return uiType; }
        public void setUiType(String uiType) { this.uiType = uiType; }
        public String getFromNodeId() { return fromNodeId; }
        public void setFromNodeId(String fromNodeId) { this.fromNodeId = fromNodeId; }
        public String getToNodeId() { return toNodeId; }
        public void setToNodeId(String toNodeId) { this.toNodeId = toNodeId; }
        public double getDiameter() { return diameter; }
        public void setDiameter(double diameter) { this.diameter = diameter; }
        public double getLength() { return length; }
        public void setLength(double length) { this.length = length; }
        public double getRoughness() { return roughness; }
        public void setRoughness(double roughness) { this.roughness = roughness; }
        public double getKFactor() { return kFactor; }
        public void setKFactor(double kFactor) { this.kFactor = kFactor; }
        public double getPumpHead() { return pumpHead; }
        public void setPumpHead(double pumpHead) { this.pumpHead = pumpHead; }
        public double getFlow() { return flow; }
        public double getVelocity() { return velocity; }
        public double getReynoldsNumber() { return reynoldsNumber; }
        public String getFlowType() { return flowType; }
        public double getFrictionFactor() { return frictionFactor; }
        public double getMajorLoss() { return majorLoss; }
        public double getMinorLoss() { return minorLoss; }
        public double getNetHeadLoss() { return netHeadLoss; }
        public double getPressureDropPa() { return pressureDropPa; }
    }

    public static class PipeConn {
        public String neighborId;
        public PhysicsPipe pipe;
        public int sign;

        public PipeConn(String neighborId, PhysicsPipe pipe, int sign) {
            this.neighborId = neighborId;
            this.pipe = pipe;
            this.sign = sign;
        }
    }

    public static class LoopPipe {
        public PhysicsPipe pipe;
        public int sign;

        public LoopPipe(PhysicsPipe pipe, int sign) {
            this.pipe = pipe;
            this.sign = sign;
        }
    }

    public static class BfsResult {
        public Set<String> treePipeIds;
        public Map<String, String> parent;
        public Map<String, PhysicsPipe> parentPipe;
        public List<String> bfsOrder;
        public Set<String> visited;

        public BfsResult(Set<String> treePipeIds, Map<String, String> parent, Map<String, PhysicsPipe> parentPipe, List<String> bfsOrder, Set<String> visited) {
            this.treePipeIds = treePipeIds;
            this.parent = parent;
            this.parentPipe = parentPipe;
            this.bfsOrder = bfsOrder;
            this.visited = visited;
        }
    }
    public static class HardyCrossResult {
        public int iterations;
        public boolean converged;

        public HardyCrossResult(int iterations, boolean converged) {
            this.iterations = iterations;
            this.converged = converged;
        }
    }








    public static class SolverResult {
        public int iterations;
        public boolean converged;

        public SolverResult(int iterations, boolean converged) {
            this.iterations = iterations;
            this.converged = converged;
        }

        public int getIterations() { return iterations; }
        public boolean isConverged() { return converged; }
    }
}
