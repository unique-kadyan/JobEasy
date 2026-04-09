package com.kaddy.autoapply.repository;

import com.kaddy.autoapply.model.Job;
import com.kaddy.autoapply.model.enums.JobSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends MongoRepository<Job, String> {
    Optional<Job> findBySourceAndExternalId(JobSource source, String externalId);

    /** Returns jobs scraped before {@code before} whose URL is non-null (candidates for pruning). */
    @Query("{'scrapedAt': {$lt: ?0}, 'url': {$exists: true, $ne: null}}")
    List<Job> findStaleJobs(LocalDateTime before, Pageable pageable);

    @Query("{'$or': [{'title': {$regex: ?0, $options: 'i'}}, {'description': {$regex: ?0, $options: 'i'}}]}")
    Page<Job> searchJobs(String query, Pageable pageable);

    @Query("{'source': ?1, '$or': [{'title': {$regex: ?0, $options: 'i'}}, {'description': {$regex: ?0, $options: 'i'}}]}")
    Page<Job> searchJobsBySource(String query, String source, Pageable pageable);
}
