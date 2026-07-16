package com.aicareerforge.repository;

import com.aicareerforge.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends MongoRepository<Post, String> {
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Post> findAllByUserIdOrderByCreatedAtDesc(String userId);

    @Query("{ 'content' : { $regex: ?0, $options: 'i' } }")
    Page<Post> findByContentRegexOrderByCreatedAtDesc(String regex, Pageable pageable);

    @Query("{ $or: [ " +
           "  { 'content': { $regex: ?0, $options: 'i' } }, " +
           "  { 'authorName': { $regex: ?0, $options: 'i' } }, " +
           "  { 'authorUsername': { $regex: ?0, $options: 'i' } } " +
           "] }")
    Page<Post> findBySearchQueryOrderByCreatedAtDesc(String regex, Pageable pageable);
}
