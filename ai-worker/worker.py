import os
import time
import json
import logging
import pika

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [AI-WORKER-SKELETON] %(message)s'
)
logger = logging.getLogger(__name__)

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'guest')
QUEUE_NAME = os.getenv('RABBITMQ_QUEUE', 'badminton.ai.queue')

def connect_to_rabbitmq():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )
    
    while True:
        try:
            logger.info(f"Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT}...")
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            logger.info(f"Successfully connected to RabbitMQ. Listening on queue '{QUEUE_NAME}'...")
            return connection, channel
        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(f"RabbitMQ connection failed ({e}). Retrying in 5 seconds...")
            time.sleep(5)

def callback(ch, method, properties, body):
    try:
        payload = json.loads(body.decode('utf-8'))
        logger.info(f"==> [JOB RECEIVED] Analysis Job Payload: {payload}")
        
        # SKELETON CONSUMER NOTICE:
        # Dự án này không huấn luyện hoặc chạy mô hình Computer Vision thật.
        # Thư mục ai-worker chỉ đóng vai trò skeleton cổng tích hợp chuẩn cho đội ngũ AI.
        analysis_id = payload.get('analysisId', 'UNKNOWN')
        match_id = payload.get('matchId', 'UNKNOWN')
        storage_path = payload.get('videoStoragePath', 'UNKNOWN')
        
        logger.info(f"Processing skeleton task for AnalysisID: {analysis_id}, MatchID: {match_id}, Video: {storage_path}")
        time.sleep(1) # Giả lập nhận diện tín hiệu
        
        logger.info(f"<== [JOB ACKNOWLEDGED] Completed skeleton consume for AnalysisID: {analysis_id}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        # Nack and requeue nếu gặp lỗi
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def main():
    logger.info("Starting Badminton AI Worker Skeleton Consumer...")
    connection, channel = connect_to_rabbitmq()
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
        channel.stop_consuming()
        connection.close()

if __name__ == '__main__':
    main()

