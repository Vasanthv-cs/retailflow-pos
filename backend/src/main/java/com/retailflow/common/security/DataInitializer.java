package com.retailflow.common.security;

import com.retailflow.modules.auth.entity.Role;
import com.retailflow.modules.auth.entity.RoleName;
import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import com.retailflow.modules.auth.repository.RoleRepository;
import com.retailflow.modules.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${retailflow.admin.initial-name:Store Administrator}")
    private String adminName;

    @Value("${retailflow.admin.initial-email:admin@retailflow.in}")
    private String adminEmail;

    @Value("${retailflow.admin.initial-password:Admin@1234}")
    private String adminPassword;

    @Value("${retailflow.admin.initial-code:ADMIN-001}")
    private String adminCode;

    public DataInitializer(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Ensure all 5 system roles exist
        for (RoleName roleName : RoleName.values()) {
            if (!roleRepository.existsByName(roleName)) {
                Role role = new Role("role-" + roleName.name().toLowerCase(), roleName, "System role: " + roleName.name());
                roleRepository.save(role);
                log.info("Initialized system role: {}", roleName);
            }
        }

        // 2. Safe initial admin bootstrap process
        Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseThrow();
        boolean adminExists = userRepository.findAll().stream()
                .anyMatch(u -> u.getRole() != null && u.getRole().getName() == RoleName.ADMIN);

        if (!adminExists) {
            log.warn("=================================================================");
            log.warn("SECURITY NOTICE: No administrator account detected in database.");
            log.warn("Creating initial administrator account [{}] from environment config.", adminEmail);
            log.warn("Please change the default password immediately after initial login!");
            log.warn("=================================================================");

            User admin = new User();
            admin.setId("emp-admin-" + UUID.randomUUID().toString().substring(0, 8));
            admin.setStoreId("store-1");
            admin.setName(adminName);
            admin.setEmail(adminEmail);
            admin.setEmployeeCode(adminCode);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setPhone("+91 80 4128 7390");
            admin.setRole(adminRole);
            admin.setShift("Full Day (9 AM - 6 PM)");
            admin.setStatus(UserStatus.ACTIVE);
            admin.setJoinedDate(LocalDate.now());

            userRepository.save(admin);
            log.info("Initial administrator successfully bootstrapped: {}", adminEmail);
        }

        // 3. Ensure primary owner admin account is provisioned
        if (userRepository.findByEmail("vasanthvvt@gmail.com").isEmpty()) {
            User ownerAdmin = new User();
            ownerAdmin.setId("emp-admin-" + UUID.randomUUID().toString().substring(0, 8));
            ownerAdmin.setStoreId("store-1");
            ownerAdmin.setName("Vasanth V");
            ownerAdmin.setEmail("vasanthvvt@gmail.com");
            ownerAdmin.setEmployeeCode("ADMIN-002");
            ownerAdmin.setPasswordHash(passwordEncoder.encode("Vasanth@0310"));
            ownerAdmin.setPhone("+91 90000 00001");
            ownerAdmin.setRole(adminRole);
            ownerAdmin.setShift("Full Day (9 AM - 6 PM)");
            ownerAdmin.setStatus(UserStatus.ACTIVE);
            ownerAdmin.setJoinedDate(LocalDate.now());
            userRepository.save(ownerAdmin);
            log.info("Provisioned owner administrator account: vasanthvvt@gmail.com");
        }

        // 4. Ensure client-demo account is provisioned for product demonstrations
        if (userRepository.findByEmail("demo@retailflow.in").isEmpty()) {
            Role managerRole = roleRepository.findByName(RoleName.MANAGER).orElse(adminRole);
            User demoUser = new User();
            demoUser.setId("emp-demo-" + UUID.randomUUID().toString().substring(0, 8));
            demoUser.setStoreId("store-1");
            demoUser.setName("Demo Store Manager");
            demoUser.setEmail("demo@retailflow.in");
            demoUser.setEmployeeCode("DEMO-001");
            demoUser.setPasswordHash(passwordEncoder.encode("Demo@2026!"));
            demoUser.setPhone("+91 90000 00002");
            demoUser.setRole(managerRole);
            demoUser.setShift("Full Day (9 AM - 6 PM)");
            demoUser.setStatus(UserStatus.ACTIVE);
            demoUser.setJoinedDate(LocalDate.now());
            userRepository.save(demoUser);
            log.info("Provisioned client demo account: demo@retailflow.in");
        }
    }
}
