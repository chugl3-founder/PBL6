package com.badminton.service;

import com.badminton.config.S3Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;

/** Time-limited links to files in the video bucket. Signing happens locally, without a call to the storage. */
@Component
@RequiredArgsConstructor
public class StorageUrls {

    private final S3Presigner s3Presigner;
    private final S3Properties s3Properties;

    public String presignedGet(String key, Duration ttl) {
        String bucket = s3Properties.bucket() != null && s3Properties.bucket().videos() != null
                ? s3Properties.bucket().videos()
                : "badminton-videos";
        return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
                .build()).url().toString();
    }
}
