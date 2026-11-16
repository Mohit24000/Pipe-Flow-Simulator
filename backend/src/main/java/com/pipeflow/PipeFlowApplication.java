package com.pipeflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PipeFlowApplication {
    public static void main(String[] args) {
        SpringApplication.run(PipeFlowApplication.class, args);
        System.out.println(" Pipe Flow Simulator Backend Running");
        System.out.println(" API: http://localhost:8080/api");

    }
}
