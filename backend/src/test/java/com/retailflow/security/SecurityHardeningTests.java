package com.retailflow.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.retailflow.common.security.JwtTokenProvider;
import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.RoleRepository;
import com.retailflow.modules.auth.repository.UserRepository;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.sales.entity.Sale;
import com.retailflow.modules.sales.repository.SaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHardeningTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String store1ManagerToken;
    private String store1CashierToken;
    private String store1InventoryToken;
    private String store1AccountantToken;
    private String store2ManagerToken;

    @BeforeEach
    void setUp() {
        Role managerRole = ensureRole(RoleName.MANAGER);
        Role cashierRole = ensureRole(RoleName.CASHIER);
        Role inventoryRole = ensureRole(RoleName.INVENTORY_STAFF);
        Role accountantRole = ensureRole(RoleName.ACCOUNTANT);

        User s1Manager = ensureUser("u-s1-mgr", "s1mgr@test.in", "EMP-S1-M", "store-1", managerRole);
        User s1Cashier = ensureUser("u-s1-csh", "s1csh@test.in", "EMP-S1-C", "store-1", cashierRole);
        User s1Inv = ensureUser("u-s1-inv", "s1inv@test.in", "EMP-S1-I", "store-1", inventoryRole);
        User s1Acc = ensureUser("u-s1-acc", "s1acc@test.in", "EMP-S1-A", "store-1", accountantRole);
        User s2Manager = ensureUser("u-s2-mgr", "s2mgr@test.in", "EMP-S2-M", "store-2", managerRole);

        store1ManagerToken = jwtTokenProvider.generateToken(s1Manager.getId(), s1Manager.getEmail(), "MANAGER", s1Manager.getName());
        store1CashierToken = jwtTokenProvider.generateToken(s1Cashier.getId(), s1Cashier.getEmail(), "CASHIER", s1Cashier.getName());
        store1InventoryToken = jwtTokenProvider.generateToken(s1Inv.getId(), s1Inv.getEmail(), "INVENTORY_STAFF", s1Inv.getName());
        store1AccountantToken = jwtTokenProvider.generateToken(s1Acc.getId(), s1Acc.getEmail(), "ACCOUNTANT", s1Acc.getName());
        store2ManagerToken = jwtTokenProvider.generateToken(s2Manager.getId(), s2Manager.getEmail(), "MANAGER", s2Manager.getName());

        if (productRepository.findById("prod-s2-test").isEmpty()) {
            Product p2 = new Product();
            p2.setId("prod-s2-test");
            p2.setStoreId("store-2");
            p2.setCategoryId("cat-1");
            p2.setSupplierId("sup-1");
            p2.setName("Store 2 Secret Product");
            p2.setBrand("Test");
            p2.setSku("SKU-S2-TEST");
            p2.setBarcode("8909999999991");
            p2.setHsnCode("100630");
            p2.setUnit("Piece");
            p2.setPurchasePrice(new BigDecimal("50.00"));
            p2.setSellingPrice(new BigDecimal("80.00"));
            p2.setGstRate(new BigDecimal("5.00"));
            p2.setStockOnHand(25);
            p2.setLowStockThreshold(5);
            p2.setStatus("Active");
            productRepository.save(p2);
        }

        if (saleRepository.findById("sale-s2-test").isEmpty()) {
            Sale s2 = new Sale();
            s2.setId("sale-s2-test");
            s2.setStoreId("store-2");
            s2.setInvoiceNumber("INV-S2-99999");
            s2.setCashierId("u-s2-mgr");
            s2.setCustomerName("Store 2 Customer");
            s2.setPaymentMethod("Cash");
            s2.setSubtotal(new BigDecimal("80.00"));
            s2.setTaxAmount(BigDecimal.ZERO);
            s2.setTotalAmount(new BigDecimal("80.00"));
            s2.setDate(Instant.now());
            saleRepository.save(s2);
        }
    }

    private Role ensureRole(RoleName name) {
        return roleRepository.findByName(name).orElseGet(() -> {
            Role r = new Role();
            r.setId("role-" + name.name().toLowerCase());
            r.setName(name);
            return roleRepository.save(r);
        });
    }

    private User ensureUser(String id, String email, String code, String storeId, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setId(id);
            u.setStoreId(storeId);
            u.setName(email);
            u.setEmail(email);
            u.setEmployeeCode(code);
            u.setPasswordHash(passwordEncoder.encode("StrongRealPass!99"));
            u.setRole(role);
            u.setStatus(UserStatus.ACTIVE);
            return userRepository.save(u);
        });
    }

    @Test
    void hardcodedBackdoorPasswordsAreRejected() throws Exception {
        for (String badPass : new String[]{"Admin@1234", "demo1234"}) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "email", "s1mgr@test.in",
                                    "password", badPass
                            ))))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void tokenInUrlQueryParamIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").param("token", store1ManagerToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedApiResponsesIncludeNoStoreCacheHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")));

        mockMvc.perform(get("/api/v1/sales")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")));

        mockMvc.perform(get("/api/v1/products")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void logoutRevokesJwtTokenAndClearsCookie() throws Exception {
        String freshToken = jwtTokenProvider.generateToken("u-s1-mgr", "s1mgr@test.in", "MANAGER", "s1mgr@test.in");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + freshToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + freshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginSetsHttpOnlyCookieAndMasksValidationPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "s1mgr@test.in",
                                "password", "StrongRealPass!99"
                        ))))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=None")));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"s1mgr@test.in\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].rejectedValue").value("******"));
    }

    @Test
    void crossStoreIdorRequestsAreBlocked() throws Exception {
        mockMvc.perform(get("/api/v1/products/prod-s2-test")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/sales/sale-s2-test")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/sales/by-invoice/INV-S2-99999")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/inventory")
                        .param("storeId", "store-2")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/events/active-listeners")
                        .param("storeId", "store-2")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void rbacMatrixPreventsPrivilegeEscalation() throws Exception {
        mockMvc.perform(put("/api/v1/store/settings")
                        .header("Authorization", "Bearer " + store1CashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hacked Store\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/employees")
                        .header("Authorization", "Bearer " + store1CashierToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/reports/summary")
                        .header("Authorization", "Bearer " + store1CashierToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/sales")
                        .header("Authorization", "Bearer " + store1InventoryToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/inventory/adjust")
                        .header("Authorization", "Bearer " + store1AccountantToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"prod-1\",\"delta\":5,\"reason\":\"test\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/sales/sale-s2-test")
                        .header("Authorization", "Bearer " + store2ManagerToken))
                .andExpect(status().isOk());
    }

    @Test
    void crossTenantReportsAndPrivilegeChangesAreBlocked() throws Exception {
        // Store 1 manager report must not include Store 2's sale (totalSalesCount = 0 for Store 1)
        mockMvc.perform(get("/api/v1/reports/summary")
                        .header("Authorization", "Bearer " + store1ManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalTransactions").value(0));

        // Cashier cannot self-assign ADMIN role via user creation or update
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + store1CashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Rogue\",\"email\":\"rogue@test.in\",\"employeeCode\":\"ROG-1\",\"password\":\"StrongPass!123\",\"phone\":\"9999999999\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        // Store 1 manager cannot modify Store 2's inventory
        mockMvc.perform(post("/api/v1/inventory/adjust")
                        .header("Authorization", "Bearer " + store1ManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"prod-s2-test\",\"delta\":5,\"reason\":\"cross-store-test\"}"))
                .andExpect(status().isForbidden());
    }
}
