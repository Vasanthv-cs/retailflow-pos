package com.retailflow.concurrency;

import com.retailflow.common.exception.BusinessException;
import com.retailflow.common.exception.InsufficientStockException;
import com.retailflow.common.security.UserPrincipal;
import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.RoleRepository;
import com.retailflow.modules.auth.repository.UserRepository;
import com.retailflow.modules.catalog.entity.Product;
import com.retailflow.modules.catalog.repository.ProductRepository;
import com.retailflow.modules.payments.repository.PaymentRepository;
import com.retailflow.modules.sales.dto.CheckoutDto;
import com.retailflow.modules.sales.repository.SaleRepository;
import com.retailflow.modules.sales.service.SalesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class InventoryConcurrencyMySqlTests {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("retailflow_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("retailflow.jwt.secret", () -> "TestSecretKeyForMySqlConcurrencySuiteAtLeast32BytesLong!");
    }

    @Autowired private SalesService salesService;
    @Autowired private ProductRepository productRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User cashier1;
    private User cashier2;

    @BeforeEach
    void setupUsers() {
        Role cashierRole = roleRepository.findByName(RoleName.CASHIER).orElseGet(() -> {
            Role r = new Role();
            r.setId("role-cashier");
            r.setName(RoleName.CASHIER);
            return roleRepository.save(r);
        });
        cashier1 = ensureCashier("c1-" + UUID.randomUUID().toString().substring(0, 6), cashierRole);
        cashier2 = ensureCashier("c2-" + UUID.randomUUID().toString().substring(0, 6), cashierRole);
    }

    private User ensureCashier(String prefix, Role role) {
        User u = new User();
        u.setId("u-" + prefix);
        u.setStoreId("store-1");
        u.setName(prefix);
        u.setEmail(prefix + "@test.in");
        u.setEmployeeCode("CODE-" + prefix);
        u.setPasswordHash(passwordEncoder.encode("StrongPass!123"));
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return userRepository.save(u);
    }

    private Product createTestProduct(String id, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setStoreId("store-1");
        p.setCategoryId("cat-1");
        p.setSupplierId("sup-1");
        p.setName("Concurrency Test " + id);
        p.setBrand("Test");
        p.setSku("SKU-" + id);
        p.setBarcode("890" + Math.abs(id.hashCode() % 1000000000));
        p.setHsnCode("100630");
        p.setUnit("Piece");
        p.setPurchasePrice(new BigDecimal("40.00"));
        p.setSellingPrice(new BigDecimal("60.00"));
        p.setGstRate(new BigDecimal("5.00"));
        p.setStockOnHand(stock);
        p.setLowStockThreshold(2);
        p.setStatus("Active");
        return productRepository.save(p);
    }

    private void authenticateAs(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private CheckoutDto.CheckoutRequest buildRequest(String productId, int qty, String idempotencyKey) {
        CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
        req.setStoreId("store-1");
        req.setPaymentMethod("Cash");
        req.setIdempotencyKey(idempotencyKey);
        CheckoutDto.CartItemRequest item = new CheckoutDto.CartItemRequest();
        item.setProductId(productId);
        item.setQuantity(qty);
        req.setItems(List.of(item));
        return req;
    }

    @Test
    void scenario1_lastItemInStock_onlyOneSucceeds() throws Exception {
        String prodId = "prod-s1-" + UUID.randomUUID().toString().substring(0, 6);
        createTestProduct(prodId, 1);
        long initialSales = saleRepository.count();
        long initialPayments = paymentRepository.count();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger failures = new AtomicInteger();

        for (User cashier : List.of(cashier1, cashier2)) {
            pool.submit(() -> {
                try {
                    authenticateAs(cashier);
                    ready.countDown();
                    start.await();
                    salesService.completeCheckout(buildRequest(prodId, 1, "idem-" + UUID.randomUUID()));
                    successes.incrementAndGet();
                } catch (InsufficientStockException ex) {
                    failures.incrementAndGet();
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
        }

        ready.await();
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(20, TimeUnit.SECONDS));

        assertEquals(1, successes.get());
        assertEquals(1, failures.get());
        assertEquals(0, productRepository.findById(prodId).orElseThrow().getStockOnHand());
        assertEquals(initialSales + 1, saleRepository.count());
        assertEquals(initialPayments + 1, paymentRepository.count());
    }

    @Test
    void scenario2_multipleUnits_20ConcurrentFor10Stock() throws Exception {
        String prodId = "prod-s2-" + UUID.randomUUID().toString().substring(0, 6);
        createTestProduct(prodId, 10);
        long initialSales = saleRepository.count();

        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger failures = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final User cashier = (i % 2 == 0) ? cashier1 : cashier2;
            pool.submit(() -> {
                try {
                    authenticateAs(cashier);
                    ready.countDown();
                    start.await();
                    salesService.completeCheckout(buildRequest(prodId, 1, "idem-" + UUID.randomUUID()));
                    successes.incrementAndGet();
                } catch (InsufficientStockException ex) {
                    failures.incrementAndGet();
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
        }

        ready.await();
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));

        assertEquals(10, successes.get());
        assertEquals(10, failures.get());
        assertEquals(0, productRepository.findById(prodId).orElseThrow().getStockOnHand());
        assertEquals(initialSales + 10, saleRepository.count());
    }

    @Test
    void scenario3_duplicateCheckout_andPayloadMismatchProtection() {
        authenticateAs(cashier1);
        try {
            String prodId = "prod-s3-" + UUID.randomUUID().toString().substring(0, 6);
            createTestProduct(prodId, 5);
            String key = "idem-dup-" + UUID.randomUUID();

            var first = salesService.completeCheckout(buildRequest(prodId, 1, key));
            var replay = salesService.completeCheckout(buildRequest(prodId, 1, key));

            assertEquals(first.getId(), replay.getId());
            assertEquals(4, productRepository.findById(prodId).orElseThrow().getStockOnHand());

            assertThrows(BusinessException.class, () ->
                    salesService.completeCheckout(buildRequest(prodId, 2, key)));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void scenario4_multiItemTransaction_rollsBackAtomically() {
        authenticateAs(cashier1);
        try {
            String p1 = "prod-s4a-" + UUID.randomUUID().toString().substring(0, 6);
            String p2 = "prod-s4b-" + UUID.randomUUID().toString().substring(0, 6);
            createTestProduct(p1, 5);
            createTestProduct(p2, 1);

            long initialSales = saleRepository.count();
            long initialPayments = paymentRepository.count();

            CheckoutDto.CheckoutRequest req = new CheckoutDto.CheckoutRequest();
            req.setStoreId("store-1");
            req.setPaymentMethod("Cash");
            req.setIdempotencyKey("idem-multi-" + UUID.randomUUID());
            CheckoutDto.CartItemRequest i1 = new CheckoutDto.CartItemRequest();
            i1.setProductId(p1);
            i1.setQuantity(2);
            CheckoutDto.CartItemRequest i2 = new CheckoutDto.CartItemRequest();
            i2.setProductId(p2);
            i2.setQuantity(5);
            req.setItems(new ArrayList<>(List.of(i1, i2)));

            assertThrows(InsufficientStockException.class, () -> salesService.completeCheckout(req));

            assertEquals(5, productRepository.findById(p1).orElseThrow().getStockOnHand());
            assertEquals(1, productRepository.findById(p2).orElseThrow().getStockOnHand());
            assertEquals(initialSales, saleRepository.count());
            assertEquals(initialPayments, paymentRepository.count());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
