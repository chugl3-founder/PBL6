package com.badminton.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutBucketPolicyRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Tự động kiểm tra và khởi tạo các S3 Buckets cần thiết khi Spring Boot khởi động.
 * Đảm bảo hệ thống hoạt động trơn tru ngay cả khi MinIO vừa được khởi tạo từ volume rỗng.
 */
@Component
public class S3BucketInitializer {
    private static final Logger log = LoggerFactory.getLogger(S3BucketInitializer.class);

    private final S3Client s3Client;
    private final S3Properties s3Properties;

    public S3BucketInitializer(S3Client s3Client, S3Properties s3Properties) {
        this.s3Client = s3Client;
        this.s3Properties = s3Properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeBuckets() {
        if (s3Properties.bucket() == null) {
            return;
        }

        ensureBucketExists(s3Properties.bucket().videos(), false);
        ensureBucketExists(s3Properties.bucket().avatars(), true);
    }

    private void ensureBucketExists(String bucketName, boolean publicRead) {
        if (bucketName == null || bucketName.isBlank()) {
            return;
        }

        try {
            boolean exists = false;
            try {
                s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
                exists = true;
                log.info("S3 Bucket '{}' đã tồn tại, sẵn sàng hoạt động.", bucketName);
            } catch (NoSuchBucketException e) {
                exists = false;
            } catch (S3Exception e) {
                if (e.statusCode() == 404) {
                    exists = false;
                } else {
                    log.warn("Kiểm tra S3 bucket '{}' trả về lỗi mã {}: {}", bucketName, e.statusCode(), e.getMessage());
                    return;
                }
            }

            if (!exists) {
                log.info("S3 Bucket '{}' chưa tồn tại. Đang tự động khởi tạo trên Object Storage...", bucketName);
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                log.info("Đã tạo thành công S3 Bucket '{}'.", bucketName);
            }

            // Thiết lập Public Download policy cho bucket avatars để frontend load trực tiếp qua thẻ <img>
            if (publicRead) {
                try {
                    String policy = """
                            {
                              "Version": "2012-10-17",
                              "Statement": [
                                {
                                  "Effect": "Allow",
                                  "Principal": "*",
                                  "Action": ["s3:GetObject"],
                                  "Resource": ["arn:aws:s3:::%s/*"]
                                }
                              ]
                            }
                            """.formatted(bucketName);
                    s3Client.putBucketPolicy(PutBucketPolicyRequest.builder()
                            .bucket(bucketName)
                            .policy(policy)
                            .build());
                    log.info("Đã thiết lập quyền đọc công khai (Public Read Policy) cho bucket '{}'.", bucketName);
                } catch (Exception ex) {
                    log.debug("Bỏ qua thiết lập bucket policy cho '{}': {}", bucketName, ex.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Không thể tự động khởi tạo S3 bucket '{}': {}. Vui lòng kiểm tra kết nối MinIO/S3.", bucketName, e.getMessage());
        }
    }
}

