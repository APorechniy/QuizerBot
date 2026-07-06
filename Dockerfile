FROM python:3.11-slim

WORKDIR /app

# Отключаем создание файлов кэша .pyc и включаем небуферизованный вывод логов
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "bot.py"]