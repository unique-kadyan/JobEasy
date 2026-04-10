package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    Page<User> findByAutoSearchEnabledTrue(Pageable pageable);
}
