FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --default-timeout=3000 --retries 10 -r requirements.txt

COPY . ./

# Port 8025 — avoids conflict with converter (which runs on 8020)
EXPOSE 8025

CMD ["uvicorn", "main_file:app", "--host", "0.0.0.0", "--port", "8025"]
