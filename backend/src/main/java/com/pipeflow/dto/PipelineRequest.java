package com.pipeflow.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public class PipelineRequest {
    @NotNull(message = "Fluid properties are required")
    @Valid
    private FluidPropertiesDto fluid;
    @NotNull
    @Positive(message = "Flow rate must be positive")
    private Double totalFlow;
    @NotNull
    private List<NodeDto> nodes;
    @NotNull
    private List<EdgeDto> edges;
    public FluidPropertiesDto getFluid() { return fluid; }
    public void setFluid(FluidPropertiesDto fluid) { this.fluid = fluid; }
    public Double getTotalFlow() { return totalFlow; }
    public void setTotalFlow(Double totalFlow) { this.totalFlow = totalFlow; }
    public List<NodeDto> getNodes() { return nodes; }
    public void setNodes(List<NodeDto> nodes) { this.nodes = nodes; }
    public List<EdgeDto> getEdges() { return edges; }
    public void setEdges(List<EdgeDto> edges) { this.edges = edges; }
}
