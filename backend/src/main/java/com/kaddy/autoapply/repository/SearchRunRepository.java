package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.SearchRun;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SearchRunRepository extends MongoRepository<SearchRun, String> {

    /** Returns the last N search runs for a user, ordered newest-first. */
    List<SearchRun> findTop10ByUserIdOrderByRunAtDesc(String userId);
}
