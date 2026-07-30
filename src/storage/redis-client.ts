import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on("connect", () => console.log("✅ Redis успешно подключен"));
redis.on("error", (err) => console.error("❌ Ошибка Redis:", err));