package com.badminton.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;

/**
 * The Gemini REST API (generativelanguage.googleapis.com), called directly so the backend needs no extra SDK.
 * The key comes from GEMINI_API_KEY in .env and travels in a header, never in the URL.
 */
@Slf4j
@Component
public class GeminiClient {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final List<String> chatModels;
    private final String embeddingModel;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public GeminiClient(ObjectMapper objectMapper,
                        @Value("${coach.gemini.api-key:}") String apiKey,
                        @Value("${coach.gemini.chat-models:gemini-3.5-flash-lite,gemini-3.8-flash}") List<String> chatModels,
                        @Value("${coach.gemini.embedding-model:gemini-embedding-001}") String embeddingModel) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.chatModels = chatModels;
        this.embeddingModel = embeddingModel;
    }

    /** Thrown when Gemini cannot be reached or refuses the call; the detail is for the log only. */
    public static class GeminiException extends RuntimeException {
        public GeminiException(String message) {
            super(message);
        }

        public GeminiException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    /** Models to try in order: the first one that answers is used. */
    public List<String> chatModels() {
        return chatModels;
    }

    /** The 768-value embedding of a text, comparable with knowledge_embeddings. */
    public List<Double> embed(String text) {
        ObjectNode body = objectMapper.createObjectNode();
        body.putObject("content").putArray("parts").addObject().put("text", text);
        body.put("outputDimensionality", 768);
        JsonNode response = post(embeddingModel + ":embedContent", body, Duration.ofSeconds(20));
        List<Double> values = new ArrayList<>();
        response.path("embedding").path("values").forEach(v -> values.add(v.asDouble()));
        if (values.isEmpty()) {
            throw new GeminiException("Embedding response without values");
        }
        return values;
    }

    /**
     * Streams one generateContent call: each server-sent chunk (a GenerateContentResponse) goes to onChunk as it
     * arrives. Returns when the answer is complete.
     */
    public void streamGenerate(String model, JsonNode body, Consumer<JsonNode> onChunk) {
        requireKey();
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + model + ":streamGenerateContent?alt=sse"))
                .timeout(Duration.ofSeconds(120))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(write(body), StandardCharsets.UTF_8))
                .build();
        HttpResponse<Stream<String>> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofLines());
        } catch (IOException e) {
            throw new GeminiException(model + " unreachable: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GeminiException(model + " call interrupted", e);
        }
        try (Stream<String> lines = response.body()) {
            if (response.statusCode() != 200) {
                throw new GeminiException(model + " HTTP " + response.statusCode() + ": " + truncate(String.join("\n", lines.toList())));
            }
            Iterator<String> it = lines.iterator();
            while (it.hasNext()) {
                String line = it.next();
                if (line.startsWith("data:")) {
                    onChunk.accept(read(line.substring(5).trim()));
                }
            }
        }
    }

    private JsonNode post(String path, JsonNode body, Duration timeout) {
        requireKey();
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + path))
                .timeout(timeout)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(write(body), StandardCharsets.UTF_8))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) {
                throw new GeminiException(path + " HTTP " + response.statusCode() + ": " + truncate(response.body()));
            }
            return read(response.body());
        } catch (IOException e) {
            throw new GeminiException(path + " unreachable: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GeminiException(path + " call interrupted", e);
        }
    }

    private void requireKey() {
        if (!isConfigured()) {
            throw new GeminiException("GEMINI_API_KEY is not set");
        }
    }

    private String write(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (IOException e) {
            throw new GeminiException("Cannot serialise the request", e);
        }
    }

    private JsonNode read(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (IOException e) {
            throw new GeminiException("Unreadable Gemini response: " + truncate(json), e);
        }
    }

    private static String truncate(String s) {
        return s == null ? "" : s.length() > 500 ? s.substring(0, 500) + "..." : s;
    }
}
