package com.badminton.controller;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.auth.RegisterRequest;
import com.badminton.dto.auth.UserResponse;
import com.badminton.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("API POST /api/auth/register trả về 201 Created khi request hợp lệ")
    void register_ValidRequest_Returns201() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test@badminton.com")
                .password("securePass123")
                .fullName("Lê Quang Liêm")
                .badmintonLevel("ADVANCED")
                .gender("MALE")
                .build();

        UserResponse mockResponse = UserResponse.builder()
                .id(1L)
                .email("test@badminton.com")
                .role("ROLE_USER")
                .fullName("Lê Quang Liêm")
                .status("ACTIVE")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.email").value("test@badminton.com"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("API POST /api/auth/register trả về 400 Bad Request khi email sai định dạng")
    void register_InvalidEmail_Returns400() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("not-an-email")
                .password("securePass123")
                .fullName("Lê Quang Liêm")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorType").value("VALIDATION"))
                .andExpect(jsonPath("$.code").value("ERR_INVALID_PAYLOAD"));
    }

    @Test
    @DisplayName("API POST /api/auth/register trả về 409 Conflict khi email đã tồn tại")
    void register_EmailAlreadyExists_Returns409() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@badminton.com")
                .password("securePass123")
                .fullName("Lê Quang Liêm")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenThrow(
                new ApiException(HttpStatus.CONFLICT, ErrorType.VALIDATION, "AUTH_EMAIL_ALREADY_EXISTS", "Email này đã được sử dụng.")
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorType").value("VALIDATION"))
                .andExpect(jsonPath("$.code").value("AUTH_EMAIL_ALREADY_EXISTS"));
    }
}

