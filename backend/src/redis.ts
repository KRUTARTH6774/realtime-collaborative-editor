import Redis from "ioredis";

export const redis = new Redis();
export const redisPublisher = new Redis();
export const redisSubscriber = new Redis();
