package com.badminton.config;

import com.badminton.common.dto.ErrorResponse;
import com.badminton.common.dto.ErrorType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Endpoint sức khỏe hệ thống & tài liệu
                .requestMatchers("/api/health", "/actuator/**", "/error").permitAll()
                // Xác thực & Quên mật khẩu
                .requestMatchers("/api/auth/**").permitAll()
                // Thư viện công khai
                .requestMatchers("/api/public-matches/**").permitAll()
                // Hồ sơ vận động viên: khách xem trận công khai, người dùng xem thêm trận của mình
                .requestMatchers(HttpMethod.GET, "/api/players", "/api/players/**").permitAll()
                // Báo cáo trinh sát được chia sẻ qua link
                .requestMatchers(HttpMethod.GET, "/api/scouting-reports/shared/*").permitAll()
                // Video stream public (có giới hạn preview 5p cho guest)
                .requestMatchers("/api/videos/*/stream").permitAll()
                // Admin endpoints bắt buộc quyền ADMIN
                .requestMatchers("/api/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                // Các endpoint còn lại yêu cầu đăng nhập
                .anyRequest().authenticated()
            )
            // A missing or expired token must answer 401 (not Spring's default 403), so the
            // frontend refreshes the access token or sends the user back to the login page.
            .exceptionHandling(handling -> handling.authenticationEntryPoint((request, response, ex) -> {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                objectMapper.writeValue(response.getOutputStream(), ErrorResponse.builder()
                        .errorType(ErrorType.SYSTEM)
                        .code("ERR_UNAUTHORIZED")
                        .message("Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.")
                        .build());
            }))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
