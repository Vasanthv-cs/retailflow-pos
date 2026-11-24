package com.retailflow.common.api;

import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthEndpoint healthEndpoint;

    public HealthController(HealthEndpoint healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> getHealth() {
        HealthComponent component = healthEndpoint.health();
        Status status = component.getStatus();

        long uptimeMillis = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> details = new HashMap<>();
        details.put("status", status.getCode());
        details.put("application", "RetailFlow POS Backend");
        details.put("version", "1.0.0");
        details.put("timestamp", Instant.now().toString());
        details.put("uptimeSeconds", uptimeMillis / 1000);
        details.put("environment", System.getProperty("spring.profiles.active", "dev"));

        return ApiResponse.ok(details, "RetailFlow POS backend is operational");
    }
}
