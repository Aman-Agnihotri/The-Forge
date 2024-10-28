import request from 'supertest';
import { app, server } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';
import { rateLimitConfig } from '../../src/middlewares/rateLimitMiddleware';

afterAll((done) => {
  server.close(done);
});

// Mock user data for testing
const mockUsers = [
    { id: '1', roles: [{ role: { name: 'admin' } }] },  // Admin user
    { id: '2', roles: [{ role: { name: 'user' } }] },   // Regular user
];

// Generate tokens for each mock user
const tokens = {
    admin: generateToken(mockUsers[0].id),
    user: generateToken(mockUsers[1].id)
};

// Mock Prisma calls
jest.mock('../../src/config/prisma', () => ({
    prisma: {
        users: {
            findUnique: jest.fn().mockImplementation(({ where: { id } }) =>
                mockUsers.find((user) => user.id === id) || null
            ),
        }
    }
}))

// Helper function to send multiple requests
const sendRequests = async (endpoint: string, token: string | null, count: number) => {
    const responses = [];
    for (let i = 0; i < count; i++) {
        const res = await request(app)
            .get(endpoint)
            .set('Authorization', token ? `Bearer ${token}` : '')
            .set('X-Forwarded-For', '123.45.67.89'); // Simulate same IP
        responses.push(res);
    }
    return responses;
};

describe('Rate Limiting Tests', () => {

    beforeAll(() => {
        // Override rate limit configurations for testing
        rateLimitConfig.ip.windowMs = 1000; // 1 second
        rateLimitConfig.ip.max = 5; // 5 requests per second

        rateLimitConfig.login.windowMs = 1000; // 1 second
        rateLimitConfig.login.max = 2; // 2 requests per second

        rateLimitConfig.registration.windowMs = 1000; // 1 second
        rateLimitConfig.registration.max = 2; // 2 requests per second

        rateLimitConfig.oauth.windowMs = 1000; // 1 second
        rateLimitConfig.oauth.max = 2; // 2 requests per second

        rateLimitConfig.roles.admin.points = 10; // 10 requests per second
        rateLimitConfig.roles.admin.duration = 1; // 1 second

        rateLimitConfig.roles.user.points = 5; // 5 requests per second
        rateLimitConfig.roles.user.duration = 1; // 1 second
    });

    describe('IP-Based Rate Limiting', () => {
        test('Blocks IP after exceeding request limit', async () => {
            const responses = await sendRequests('/', null, 5);

            const allowedResponses = responses.slice(0, 5);
            const blockedResponses = responses.slice(5);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });
            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429); // Rate limit exceeded
                expect(res.body.message).toBe('Too many requests, please try again later after 60 seconds.');
            });
        });

        test('Unblocks IP after cooldown period', async () => {
            await new Promise((r) => setTimeout(r, 1000)); // 60-second cooldown

            const res = await request(app).get('/')
                .set('X-Forwarded-For', '123.45.67.89');

            expect(res.status).toBe(200); // Request should be allowed after cooldown
        });
    });

    describe('User-Based Rate Limiting', () => {
        test('Allows different rate limits for different user roles', async () => {
            const adminResponses = await sendRequests('/v1/api/', tokens.admin, 10); // Higher limit for admin
            const userResponses = await sendRequests('/v1/api/', tokens.user, 5); // Regular limit for user

            const allowedAdminResponses = adminResponses.slice(0, 10);
            const blockedAdminResponses = adminResponses.slice(10);

            allowedAdminResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });
            blockedAdminResponses.forEach((res) => {
                expect(res.status).toBe(429); // Admin limit exceeded
            });

            const allowedUserResponses = userResponses.slice(0, 5); // Assuming user limit is 10
            const blockedUserResponses = userResponses.slice(5);

            allowedUserResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });
            blockedUserResponses.forEach((res) => {
                expect(res.status).toBe(429); // User limit exceeded
            });
        });

        test('Resets user rate limit after cooldown period', async () => {
            await new Promise((r) => setTimeout(r, 1000)); // Assuming 60-second cooldown

            const res = await request(app)
                .get('/v1/api/')
                .set('Authorization', `Bearer ${tokens.user}`);

            expect(res.status).toBe(200); // Request should be allowed after cooldown
        });
    });
});