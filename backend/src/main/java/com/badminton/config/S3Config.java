package com.badminton.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
@EnableConfigurationProperties(S3Properties.class)
public class S3Config {
    private final S3Properties properties;

    public S3Config(S3Properties properties) {
        this.properties = properties;
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(properties.endpoint()))
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials()))
                .serviceConfiguration(serviceConfiguration())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        // Signed links must go through the S3 API. publicUrl is not one: on Supabase it is the
        // /object/public path, which answers "Bucket not found" for a private bucket.
        String presignerEndpoint = (properties.presignEndpoint() != null && !properties.presignEndpoint().isBlank())
                ? properties.presignEndpoint()
                : properties.endpoint();
        return S3Presigner.builder()
                .endpointOverride(URI.create(presignerEndpoint))
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials()))
                .serviceConfiguration(serviceConfiguration())
                .build();
    }

    private AwsBasicCredentials credentials() {
        return AwsBasicCredentials.create(properties.accessKey(), properties.secretKey());
    }

    private S3Configuration serviceConfiguration() {
        // Supabase Storage answers larger PUTs with a multipart-style ETag ("<hash>-<parts>"),
        // which the SDK cannot read as an MD5 and rejects after the object is already stored.
        return S3Configuration.builder()
                .pathStyleAccessEnabled(properties.pathStyleAccess())
                .checksumValidationEnabled(false)
                .build();
    }
}
