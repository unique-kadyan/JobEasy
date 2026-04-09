package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /**
     * Paginated query for users with auto-search opted in.
     * Used by {@code AutoSearchSchedulerService} to avoid loading the entire
     * user collection into memory at once on every hourly tick.
     */
    Page<User> findByAutoSearchEnabledTrue(Pageable pageable);
}
