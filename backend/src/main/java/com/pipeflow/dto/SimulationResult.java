package com.pipeflow.dto;

import java.util.List;

public class SimulationResult {
    private double actualHeadLoss;
    private double totalHeadLoss;
    private double totalMajorLoss;
    private double totalMinorLoss;
    private double totalPumpHead;
    private double netSystemHeadLoss;
    private double requiredPumpHead;
    private double actualPressureDropPa;
    private double totalPressureDropPa;
    private int hardyCrossIterations;
    private boolean converged;
    private List<SegmentResult> segments;
    private List<String> warnings;

    public double getActualHeadLoss() { return actualHeadLoss; }
    public void setActualHeadLoss(double actualHeadLoss) { this.actualHeadLoss = actualHeadLoss; }
    public double getTotalHeadLoss() { return totalHeadLoss; }
    public void setTotalHeadLoss(double totalHeadLoss) { this.totalHeadLoss = totalHeadLoss; }
    public double getTotalMajorLoss() { return totalMajorLoss; }
    public void setTotalMajorLoss(double totalMajorLoss) { this.totalMajorLoss = totalMajorLoss; }
    public double getTotalMinorLoss() { return totalMinorLoss; }
    public void setTotalMinorLoss(double totalMinorLoss) { this.totalMinorLoss = totalMinorLoss; }
    public double getTotalPumpHead() { return totalPumpHead; }
    public void setTotalPumpHead(double totalPumpHead) { this.totalPumpHead = totalPumpHead; }
    public double getNetSystemHeadLoss() { return netSystemHeadLoss; }
    public void setNetSystemHeadLoss(double netSystemHeadLoss) { this.netSystemHeadLoss = netSystemHeadLoss; }
    public double getRequiredPumpHead() { return requiredPumpHead; }
    public void setRequiredPumpHead(double requiredPumpHead) { this.requiredPumpHead = requiredPumpHead; }
    public double getActualPressureDropPa() { return actualPressureDropPa; }
    public void setActualPressureDropPa(double actualPressureDropPa) { this.actualPressureDropPa = actualPressureDropPa; }
    public double getTotalPressureDropPa() { return totalPressureDropPa; }
    public void setTotalPressureDropPa(double totalPressureDropPa) { this.totalPressureDropPa = totalPressureDropPa; }
    public int getHardyCrossIterations() { return hardyCrossIterations; }
    public void setHardyCrossIterations(int hardyCrossIterations) { this.hardyCrossIterations = hardyCrossIterations; }
    public boolean isConverged() { return converged; }
    public void setConverged(boolean converged) { this.converged = converged; }
    public List<SegmentResult> getSegments() { return segments; }
    public void setSegments(List<SegmentResult> segments) { this.segments = segments; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }
}
