package com.badminton.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "badminton.ai.exchange";
    public static final String QUEUE_NAME = "badminton.ai.queue";
    public static final String ROUTING_KEY = "badminton.ai.routingKey";

    /** Connects at startup so the first analysis request does not wait for the broker handshake. */
    @Bean
    public ApplicationRunner rabbitConnectionWarmup(ConnectionFactory connectionFactory) {
        return args -> {
            try {
                connectionFactory.createConnection().close();
            } catch (AmqpException e) {
                log.warn("Could not connect to RabbitMQ at startup: {}", e.getMessage());
            }
        };
    }

    @Bean
    public DirectExchange aiExchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue aiQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Bean
    public Binding aiBinding(Queue aiQueue, DirectExchange aiExchange) {
        return BindingBuilder.bind(aiQueue).to(aiExchange).with(ROUTING_KEY);
    }
}

