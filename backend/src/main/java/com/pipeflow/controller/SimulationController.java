package com.pipeflow.controller;

import com.pipeflow.dto.PipelineRequest;
import com.pipeflow.dto.SimulationResult;
import com.pipeflow.service.SimulationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SimulationController {

    private static final Logger log = LoggerFactory.getLogger(SimulationController.class);

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "Pipe Flow Simulator",
            "version", "1.1.0"
        ));
    }

    @GetMapping("/materials")
    public ResponseEntity<?> materials() {
        return ResponseEntity.ok(Map.of(
            "materials", List.of(
                Map.of("name", "Commercial Steel",     "roughness", 0.000046),
                Map.of("name", "Galvanized Steel",     "roughness", 0.00015),
                Map.of("name", "Cast Iron",            "roughness", 0.00026),
                Map.of("name", "Wrought Iron",         "roughness", 0.00046),
                Map.of("name", "Concrete",             "roughness", 0.003),
                Map.of("name", "PVC / Smooth Plastic", "roughness", 0.0000015),
                Map.of("name", "Copper / Brass",       "roughness", 0.0000015),
                Map.of("name", "Stainless Steel",      "roughness", 0.000002),
                Map.of("name", "Drawn Tubing",         "roughness", 0.0000015),
                Map.of("name", "Riveted Steel",        "roughness", 0.003)
            )
        ));
    }

    @PostMapping("/simulate")
    public ResponseEntity<SimulationResult> simulate(@Valid @RequestBody PipelineRequest request) {
        log.info("Simulation request: {} nodes, {} edges, fluid={}",
            request.getNodes().size(),
            request.getEdges().size(),
            request.getFluid().getName());

        SimulationResult result = simulationService.simulate(request);
        log.info("Simulation complete: totalHL={} m, iterations={}",
            result.getTotalHeadLoss(), result.getHardyCrossIterations());

        return ResponseEntity.ok(result);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .reduce("", (a, b) -> a.isEmpty() ? b : a + "; " + b);
        return ResponseEntity.badRequest().body(Map.of("error", msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        log.error("Simulation error", ex);
        return ResponseEntity.internalServerError()
            .body(Map.of("error", "Simulation failed: " + ex.getMessage()));
    }
}
