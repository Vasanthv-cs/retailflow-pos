package com.retailflow.modules.auth.controller;

import com.retailflow.common.api.ApiResponse;
import com.retailflow.modules.auth.dto.AuthDtos;
import com.retailflow.modules.auth.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final UserService userService;

    public EmployeeController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<AuthDtos.UserResponseDto>> getEmployees() {
        return ApiResponse.ok(userService.getAllEmployees());
    }
}
