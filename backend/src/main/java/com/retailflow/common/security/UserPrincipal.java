package com.retailflow.common.security;

import com.retailflow.modules.auth.entity.User;
import com.retailflow.modules.auth.entity.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class UserPrincipal implements UserDetails {

    private final String id;
    private final String name;
    private final String email;
    private final String employeeCode;
    private final String password;
    private final String roleName;
    private final String storeId;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(String id, String name, String email, String employeeCode,
                         String password, String roleName, String storeId, boolean active,
                         Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.employeeCode = employeeCode;
        this.password = password;
        this.roleName = roleName;
        this.storeId = storeId;
        this.active = active;
        this.authorities = authorities;
    }

    public static UserPrincipal create(User user) {
        String roleStr = user.getRole() != null ? user.getRole().getName().name() : "CASHIER";
        GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + roleStr);
        boolean isActive = user.getStatus() == UserStatus.ACTIVE;

        return new UserPrincipal(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getEmployeeCode(),
                user.getPasswordHash(),
                roleStr,
                user.getStoreId(),
                isActive,
                Collections.singletonList(authority)
        );
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmployeeCode() { return employeeCode; }
    public String getRoleName() { return roleName; }
    public String getStoreId() { return storeId; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
