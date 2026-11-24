package com.retailflow;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class RetailFlowApplicationTests {

    @Test
    @DisplayName("Should successfully load application context with in-memory test profile")
    void contextLoads() {
    }
}
