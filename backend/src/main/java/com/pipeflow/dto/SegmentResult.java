package com.pipeflow.dto;

public class SegmentResult {
    private String nodeId;
    private String label;
    private String type;
    private double flowRate;
    private double velocity;
    private double reynoldsNumber;
    private String flowType;
    private double frictionFactor;
    private double majorLoss;
    private double minorLoss;
    private double pumpHead;
    private double netHeadLoss;
    private double pressureDropPa;
    private double diameter;
    private double length;
    private double severityScore;
    private String severityBand;

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public double getFlowRate() { return flowRate; }
    public void setFlowRate(double flowRate) { this.flowRate = flowRate; }
    public double getVelocity() { return velocity; }
    public void setVelocity(double velocity) { this.velocity = velocity; }
    public double getReynoldsNumber() { return reynoldsNumber; }
    public void setReynoldsNumber(double reynoldsNumber) { this.reynoldsNumber = reynoldsNumber; }
    public String getFlowType() { return flowType; }
    public void setFlowType(String flowType) { this.flowType = flowType; }
    public double getFrictionFactor() { return frictionFactor; }
    public void setFrictionFactor(double frictionFactor) { this.frictionFactor = frictionFactor; }
    public double getMajorLoss() { return majorLoss; }
    public void setMajorLoss(double majorLoss) { this.majorLoss = majorLoss; }
    public double getMinorLoss() { return minorLoss; }
    public void setMinorLoss(double minorLoss) { this.minorLoss = minorLoss; }
    public double getPumpHead() { return pumpHead; }
    public void setPumpHead(double pumpHead) { this.pumpHead = pumpHead; }
    public double getNetHeadLoss() { return netHeadLoss; }
    public void setNetHeadLoss(double netHeadLoss) { this.netHeadLoss = netHeadLoss; }
    public double getPressureDropPa() { return pressureDropPa; }
    public void setPressureDropPa(double pressureDropPa) { this.pressureDropPa = pressureDropPa; }
    public double getDiameter() { return diameter; }
    public void setDiameter(double diameter) { this.diameter = diameter; }
    public double getLength() { return length; }
    public void setLength(double length) { this.length = length; }
    public double getSeverityScore() { return severityScore; }
    public void setSeverityScore(double severityScore) { this.severityScore = severityScore; }
    public String getSeverityBand() { return severityBand; }
    public void setSeverityBand(String severityBand) { this.severityBand = severityBand; }
}
