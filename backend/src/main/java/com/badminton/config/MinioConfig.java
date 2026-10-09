package com.badminton.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.public-url:http://localhost:9000}")
    private String publicUrl;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name:badminton-videos}")
    private String videoBucket;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Bean(name = "minioPresignerClient")
    public MinioClient minioPresignerClient() {
        return MinioClient.builder()
                .endpoint(publicUrl)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Bean
    public ApplicationRunner initMinioBuckets(MinioClient minioClient) {
        return args -> {
            try {
                // 1. Bucket badminton-videos
                boolean videoBucketExists = minioClient.bucketExists(
                        BucketExistsArgs.builder().bucket(videoBucket).build()
                );
                if (!videoBucketExists) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(videoBucket).build());
                    log.info("Đã tạo mới MinIO bucket: {}", videoBucket);
                }

                // Cấu hình policy download cho bucket videos
                String videoPolicy = """
                    {
                      "Version": "2012-10-17",
                      "Statement": [
                        {
                          "Effect": "Allow",
                          "Principal": {"AWS": ["*"]},
                          "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                          "Resource": ["arn:aws:s3:::%s"]
                        },
                        {
                          "Effect": "Allow",
                          "Principal": {"AWS": ["*"]},
                          "Action": ["s3:GetObject"],
                          "Resource": ["arn:aws:s3:::%s/*"]
                        }
                      ]
                    }
                    """.formatted(videoBucket, videoBucket);

                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder().bucket(videoBucket).config(videoPolicy).build()
                );
                log.info("Đã cấu hình quyền Public Download cho MinIO bucket: {}", videoBucket);

                // 2. Bucket badminton-avatars
                boolean avatarBucketExists = minioClient.bucketExists(
                        BucketExistsArgs.builder().bucket("badminton-avatars").build()
                );
                if (!avatarBucketExists) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket("badminton-avatars").build());
                    log.info("Đã tạo mới MinIO bucket: badminton-avatars");
                }

                String avatarPolicy = """
                    {
                      "Version": "2012-10-17",
                      "Statement": [
                        {
                          "Effect": "Allow",
                          "Principal": {"AWS": ["*"]},
                          "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                          "Resource": ["arn:aws:s3:::badminton-avatars"]
                        },
                        {
                          "Effect": "Allow",
                          "Principal": {"AWS": ["*"]},
                          "Action": ["s3:GetObject"],
                          "Resource": ["arn:aws:s3:::badminton-avatars/*"]
                        }
                      ]
                    }
                    """;

                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder().bucket("badminton-avatars").config(avatarPolicy).build()
                );
                log.info("Đã cấu hình quyền Public Download cho MinIO bucket: badminton-avatars");

            } catch (Exception e) {
                log.warn("Lưu ý khi khởi tạo MinIO buckets: {}", e.getMessage());
            }
        };
    }
}
