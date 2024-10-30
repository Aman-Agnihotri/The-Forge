import request from 'supertest';
import { app, server } from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { getRateLimitConfig, testIP, testUserIP, testAdminIP  } from '../src/utils/constants';

// Mock user data for testing
const mockUsers = [
    { id: 'cm2ust9kd00090cjp97y37jbb', roles: [{ role: { name: 'admin' } }] },  // Admin user
    { id: 'cm2usvs7v000e0cjpfwam08rh', roles: [{ role: { name: 'user' } }] },   // Regular user
];

const testRateLimits = getRateLimitConfig();

// Generate tokens for each mock user
const tokens = {
    admin: generateToken(mockUsers[0].id),
    user: generateToken(mockUsers[1].id),
};

// Mock Prisma calls
jest.mock('../src/config/prisma', () => ({
    prisma: {
        users: {
            findUnique: jest.fn().mockImplementation(({ where: { id } }) =>
                mockUsers.find((user) => user.id === id) || null
            ),
        }
    }
}))

describe('Rate Limiting Tests', () => {

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    // Helper function to send multiple requests
    const sendRequests = async (IP: string, endpoint: string, token: string | null, count: number) => {
        return Promise.all(
            Array(count).fill(null).map(() => 
                request(app)
                    .get(endpoint)
                    .set('Authorization', token ? `Bearer ${token}` : '')
                    .set('X-Forwarded-For', IP)
            )
        );
    };

    // Helper function to wait for rate limit reset
    const waitForReset = async (duration: number) => {
        await new Promise(resolve => setTimeout(resolve, duration));
    };

    describe('IP-Based Rate Limiting', () => {
        test('Blocks IP after exceeding request limit', async () => {
            const responses = await sendRequests(testIP, '/', null, testRateLimits.ip.limit + 5);

            const allowedResponses = responses.slice(0, testRateLimits.ip.limit);
            const blockedResponses = responses.slice(testRateLimits.ip.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many requests from this IP, please try again after " + testRateLimits.ip.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks IP after cooldown period', async () => {
            await waitForReset(testRateLimits.ip.windowMs);

            const res = await request(app).get('/').set('X-Forwarded-For', testIP);

            expect(res.status).toBe(200);
        });
    });

    describe('User-Based Rate Limiting', () => {
        test('Allows different rate limits for different user roles', async () => {
            const [adminResponses, userResponses] = await Promise.all([
                sendRequests(testAdminIP, `/v1/api/users/${mockUsers[0].id}`, tokens.admin, testRateLimits.roles.admin.points + 5),
                sendRequests(testUserIP, `/v1/api/users/${mockUsers[1].id}`, tokens.user, testRateLimits.roles.user.points + 5)
            ]);

            // Check admin responses
            const allowedAdminResponses = adminResponses.slice(0, testRateLimits.roles.admin.points);
            const blockedAdminResponses = adminResponses.slice(testRateLimits.roles.admin.points);

            allowedAdminResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });

            blockedAdminResponses.forEach((res) => {
                expect(res.status).toBe(429); // Admin limit exceeded
            });

            // Check user responses
            const allowedUserResponses = userResponses.slice(0, testRateLimits.roles.user.points);
            const blockedUserResponses = userResponses.slice(testRateLimits.roles.user.points);

            allowedUserResponses.forEach((res) => {
                expect(res.status).toBe(200);
            });
            blockedUserResponses.forEach((res) => {
                expect(res.status).toBe(429); // User limit exceeded
            });

        });

        test('Resets admin and user rate limit after cooldown period', async () => {
            await waitForReset(testRateLimits.roles.admin.duration * 1000);

            const [adminRes, userRes] = await Promise.all([
                request(app)
                    .get(`/v1/api/users/${mockUsers[0].id}`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .set('X-Forwarded-For', testAdminIP),
                request(app)
                    .get(`/v1/api/users/${mockUsers[1].id}`)
                    .set('Authorization', `Bearer ${tokens.user}`)
                    .set('X-Forwarded-For', testUserIP)
            ]);
                
            expect(adminRes.status).toBe(200);
            expect(userRes.status).toBe(200);
        });
    });
});