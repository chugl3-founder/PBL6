package com.badminton.service;

import org.springframework.cache.annotation.CacheEvict;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Drops the cached public Replay data of the match whose id is the method's {@code id} parameter. */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@CacheEvict(cacheNames = {"publicVideo", "publicEvents", "publicRallies", "publicStatistics"}, key = "#id")
public @interface EvictsPublicReplay {
}
