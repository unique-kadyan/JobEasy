package com.kaddy.autoapply.controller;

import com.kaddy.autoapply.dto.request.ProfileUpdateRequest;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile((String) auth.getPrincipal()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(Authentication auth,
                                                       @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile((String) auth.getPrincipal(), request));
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication auth) {
        userService.deleteAccount((String) auth.getPrincipal());
        return ResponseEntity.noContent().build();
    }
}
