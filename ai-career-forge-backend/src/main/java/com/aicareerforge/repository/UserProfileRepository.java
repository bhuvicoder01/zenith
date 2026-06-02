package com.aicareerforge.repository;

import com.aicareerforge.model.UserProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserProfileRepository extends MongoRepository<UserProfile, String> {
    Optional<UserProfile> findByUserId(String userId);
    Optional<UserProfile> findByUsername(String username);
    boolean existsByUsername(String username);

    @org.springframework.data.mongodb.repository.Query("{ 'settings.hideProfile': { $ne: true } }")
    List<UserProfile> findAllPublic();

    @org.springframework.data.mongodb.repository.Query("{ " +
            "  'settings.hideProfile': { $ne: true }, " +
            "  $or: [ " +
            "    { 'username': { $regex: ?0, $options: 'i' } }, " +
            "    { 'fullName': { $regex: ?0, $options: 'i' } }, " +
            "    { 'headline': { $regex: ?0, $options: 'i' } }, " +
            "    { 'skills': { $regex: ?0, $options: 'i' } } " +
            "  ] " +
            "}")
    List<UserProfile> searchPublic(String query);

    List<UserProfile> findAllByUserIdIn(List<String> userIds);
}
