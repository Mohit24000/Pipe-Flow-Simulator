package com.pipeflow.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotBlank;
public class FluidPropertiesDto {
    @NotBlank(message="Fluid name is required")
    private String name;
    @Positive(message="Fluid density must be > 0 kg/m³")
    private double density;
    @Positive(message="Dynamic viscosity must be > 0 Pa·s")
    private double dynamicViscosity;
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getDensity() { return density; }
    public void setDensity(double density) { this.density = density; }
    public double getDynamicViscosity() { return dynamicViscosity; }
    public void setDynamicViscosity(double dynamicViscosity) { this.dynamicViscosity = dynamicViscosity; }
}
