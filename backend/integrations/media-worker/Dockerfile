FROM python:3.12-slim

# ffmpeg cuts and encodes the clips; DejaVu covers Vietnamese for the overlay text.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp needs a JavaScript runtime to read every YouTube format; deno is the one it enables by default.
COPY --from=denoland/deno:bin-2.5.6 /deno /usr/local/bin/deno

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "worker.py"]
