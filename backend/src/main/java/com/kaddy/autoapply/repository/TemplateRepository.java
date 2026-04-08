package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Template;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface TemplateRepository extends MongoRepository<Template, String> {
    @Query("{'$or': [{'isSystem': true}, {'userId': ?0}]}")
    List<Template> findAllForUser(String userId);

    List<Template> findByIsSystemTrue();
}
