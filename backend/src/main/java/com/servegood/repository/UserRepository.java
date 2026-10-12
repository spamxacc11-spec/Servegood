package com.servegood.repository;

import com.servegood.entity.User;
import com.servegood.entity.enums.RoleName;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("select count(distinct u) from User u join u.roles r where r.name = :role and u.deletedAt is null")
    long countByRole(RoleName role);

    @Query("select distinct u from User u join u.roles r where r.name = :role and u.deletedAt is null and u.status = 'ACTIVE' order by u.fullName")
    List<User> findActiveByRole(RoleName role);
}
