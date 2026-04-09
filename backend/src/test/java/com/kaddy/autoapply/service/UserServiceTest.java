package com.kaddy.autoapply.service;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.kaddy.autoapply.config.security.InputSanitizer;
import com.kaddy.autoapply.dto.request.ProfileUpdateRequest;
import com.kaddy.autoapply.dto.response.UserResponse;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private InputSanitizer sanitizer;
    @InjectMocks
    private UserService userService;

    @Test
    void getProfile_shouldReturnUserResponse() {
        User user = User.builder().id("u1").email("a@b.com").name("Alice").build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        UserResponse response = userService.getProfile("u1");

        assertEquals("Alice", response.name());
        assertEquals("a@b.com", response.email());
    }

    @Test
    void getProfile_shouldThrowForUnknownUser() {
        when(userRepository.findById("unknown")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.getProfile("unknown"));
    }

    @Test
    void updateProfile_shouldSanitizeInputs() {
        User user = User.builder().id("u1").email("a@b.com").name("Alice").build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(sanitizer.sanitize("New Name")).thenReturn("New Name");
        when(sanitizer.sanitize("<script>xss</script>")).thenReturn("xss");

        var request = new ProfileUpdateRequest("New Name", "<script>xss</script>", null, null, null, null, null, null,
                null, null, null, null);
        userService.updateProfile("u1", request);

        verify(sanitizer).sanitize("New Name");
        verify(sanitizer).sanitize("<script>xss</script>");
    }

    @Test
    void deleteAccount_shouldDeleteUser() {
        User user = User.builder().id("u1").email("a@b.com").name("Alice").build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        userService.deleteAccount("u1");

        verify(userRepository).delete(user);
    }
}
