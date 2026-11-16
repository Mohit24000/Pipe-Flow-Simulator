package com.pipeflow.dto;

public class NodeDto {
    private String id;
    private String label;
    private String type;
    private Double elevation;
    private Double externalFlow;
    private Double length;
    private Double diameter;
    private Double roughness;
    private Double diameterIn;
    private Double diameterOut;
    private Integer angle;
    private String valveType;
    private Double kFactor;
    private Double pumpHead;
    private Double entranceK;   // K for entrance loss applied on src withadjacent pipes
    private Double exitK;  // K for exit loss applied on sink withadjacent pipes


    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Double getElevation() { return elevation; }
    public void setElevation(Double elevation) { this.elevation = elevation; }
    public Double getExternalFlow() { return externalFlow; }
    public void setExternalFlow(Double externalFlow) { this.externalFlow = externalFlow; }
    public Double getLength() { return length; }
    public void setLength(Double length) { this.length = length; }
    public Double getDiameter() { return diameter; }
    public void setDiameter(Double diameter) { this.diameter = diameter; }
    public Double getRoughness() { return roughness; }
    public void setRoughness(Double roughness) { this.roughness = roughness; }
    public Double getDiameterIn() { return diameterIn; }
    public void setDiameterIn(Double diameterIn) { this.diameterIn = diameterIn; }
    public Double getDiameterOut() { return diameterOut; }
    public void setDiameterOut(Double diameterOut) { this.diameterOut = diameterOut; }
    public Integer getAngle() { return angle; }
    public void setAngle(Integer angle) { this.angle = angle; }
    public String getValveType() { return valveType; }
    public void setValveType(String valveType) { this.valveType = valveType; }
    public Double getKFactor() { return kFactor; }
    public void setKFactor(Double kFactor) { this.kFactor = kFactor; }
    public Double getPumpHead() { return pumpHead; }
    public void setPumpHead(Double pumpHead) { this.pumpHead = pumpHead; }
    public Double getEntranceK() { return entranceK; }
    public void setEntranceK(Double entranceK) { this.entranceK = entranceK; }
    public Double getExitK() { return exitK; }
    public void setExitK(Double exitK) { this.exitK = exitK; }
}
