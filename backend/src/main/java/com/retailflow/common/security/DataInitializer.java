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
    }
}
