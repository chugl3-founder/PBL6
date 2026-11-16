package com.badminton.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "storage.s3")
public record S3Properties(
        String endpoint,
        String publicUrl,
        /* Host that browsers reach for signed links, when it differs from endpoint (MinIO in Docker). */
        String presignEndpoint,
        String accessKey,
        String secretKey,
        String region,
        boolean pathStyleAccess,
        Bucket bucket
) {
    public record Bucket(String videos, String avatars) {
    }
}
