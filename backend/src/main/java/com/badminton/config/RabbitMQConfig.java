package com.badminton.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "badminton.ai.exchange";
    public static final String QUEUE_NAME = "badminton.ai.queue";
    public static final String ROUTING_KEY = "badminton.ai.routingKey";

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

