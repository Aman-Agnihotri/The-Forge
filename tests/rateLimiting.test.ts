import request from 'supertest';
import { app, server } from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { getRateLimitConfig, testIP, testUserIP, testAdminIP  } from '../src/utils/constants';

// Mock user data for testing
const mockUsers = [
    { id: 'cm2ust9kd00090cjp97y37jbb', roles: [{ role: { name: 'admin' } }], providers: [] },  // Admin user
    { id: 'cm2usvs7v000e0cjpfwam08rh', roles: [{ role: { name: 'user' } }], providers: [] },   // Regular user
    { id: 'cm2rsk2zw0004nury51slrgu0', roles: [{ role: { name: 'user' } }], providers: [ { providerName: "kuchhbhinahi" }] },   // Test user
];

const testValidId = 'cm2rsk2zw0004nury51slrgu0';
let testToken: string;

const extraRequests = 3; // Number of extra requests to exceed rate limit

const testUser = {
    login: {
        email: '',
        password: '',
    },
    register: {
        username: '',
        email: '',
        password: '',
    },
    refresh_token: {
        refreshToken: '',
    },
}

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
                mockUsers.find((user) => user.id === id) ?? null
            ),
        },
        user_provider: {
            findFirst: jest.fn().mockImplementation(({ where: { userId, providerName } }) => 
                mockUsers.find((user) => user.id === userId && user.providers.some((provider) => provider.providerName === providerName)) ?? null
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

    // Helper function to send multiple POST requests
    const sendPostRequests = async (endpoint: string, body: any, token: string | null, count: number) => {
        return Promise.all(
            Array(count).fill(null).map(() =>
                request(app)
                    .post(endpoint)
                    .send(body)
                    .set('Authorization', token ? `Bearer ${token}` : '')
                    .set('X-Forwarded-For', testIP)
            )
        );
    };

    // Helper function to send multiple DELETE requests
    const sendDeleteRequests = async (endpoint: string, token: string | null, count: number) => {
        return Promise.all(
            Array(count).fill(null).map(() =>
                request(app)
                    .delete(endpoint)
                    .set('Authorization', token ? `Bearer ${token}` : '')
                    .set('X-Forwarded-For', testIP)
            )
        );
    };

    // Helper function to wait for rate limit reset
    const waitForReset = async (duration: number) => {
        await new Promise(resolve => setTimeout(resolve, duration));
    };

    describe('IP-Based Rate Limiting', () => {
        test('Blocks IP after exceeding request limit', async () => {
            const responses = await sendRequests(testIP, '/', null, testRateLimits.ip.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.ip.limit);
            const blockedResponses = responses.slice(testRateLimits.ip.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(200);
                expect(res.text).toBe("The Forge API is running. Go to /api-docs to view the API documentation.");
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
            expect(res.text).toBe("The Forge API is running. Go to /api-docs to view the API documentation.");
        });
    });

    describe('Route Specific Rate Limiting', () => {

        beforeAll(() => {
            testToken = generateToken(testValidId);
        });

        test('Blocks requests to login route after exceeding limit', async () => {
            const responses = await sendPostRequests('/v1/auth/login', testUser.login, null, testRateLimits.login.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.login.limit);
            const blockedResponses = responses.slice(testRateLimits.login.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(400);
                expect(res.body.message).toBe("Email cannot be empty. It is required.");
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many login attempts from this IP, please try again after " + testRateLimits.login.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks login route after cooldown period', async () => {
            await waitForReset(testRateLimits.login.windowMs);

            const res = await request(app)
                .post('/v1/auth/login')
                .send(testUser.login)
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email cannot be empty. It is required.");
        });

        test('Blocks requests to register route after exceeding limit', async () => {
            const responses = await sendPostRequests('/v1/auth/register', testUser.register, null, testRateLimits.registration.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.registration.limit);
            const blockedResponses = responses.slice(testRateLimits.registration.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(400);
                expect(res.body.message).toBe("Username cannot be empty. It is required.");
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many registration attempts from this IP, please try again after " + testRateLimits.registration.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks register route after cooldown period', async () => {
            await waitForReset(testRateLimits.registration.windowMs);

            const res = await request(app)
                .post('/v1/auth/register')
                .send(testUser.register)
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Username cannot be empty. It is required.");
        });

        test('Blocks requests to refresh token route after exceeding limit', async () => {
            const responses = await sendPostRequests('/v1/auth/refresh', testUser.refresh_token, null, testRateLimits.token_refresh.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.token_refresh.limit);
            const blockedResponses = responses.slice(testRateLimits.token_refresh.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(400);
                expect(res.body.message).toBe("Missing token.");
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many token refresh attempts from this IP, please try again after " + testRateLimits.token_refresh.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks refresh token route after cooldown period', async () => {
            await waitForReset(testRateLimits.token_refresh.windowMs);

            const res = await request(app)
                .post('/v1/auth/refresh')
                .send(testUser.refresh_token)
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Missing token.");
        });

        test('Blocks requests to OAuth route after exceeding limit', async () => {
            const responses = await sendRequests(testIP, '/v1/auth/google', null, testRateLimits.oauth.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.oauth.limit);
            const blockedResponses = responses.slice(testRateLimits.oauth.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(302);
                expect(res.header.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fv1%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=566816162822-p10741tj0f33jfffv41qfgvpnhn75uam.apps.googleusercontent.com');
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many login attempts from this IP, please try again after " + testRateLimits.oauth.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks OAuth route after cooldown period', async () => {
            await waitForReset(testRateLimits.oauth.windowMs);

            const res = await request(app)
                .get('/v1/auth/google')
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fv1%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=566816162822-p10741tj0f33jfffv41qfgvpnhn75uam.apps.googleusercontent.com');
        });

        test('Blocks requests to OAuth linking route after exceeding limit', async () => {

            const responses = await sendRequests(testIP, '/v1/auth/google?linking=true&token=' + testToken, null, testRateLimits.oauth.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.oauth.limit);
            const blockedResponses = responses.slice(testRateLimits.oauth.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(302);
                expect(res.header.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fv1%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=566816162822-p10741tj0f33jfffv41qfgvpnhn75uam.apps.googleusercontent.com');
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many OAuth linking attempts from this IP, please try again after " + testRateLimits.oauth.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks OAuth linking route after cooldown period', async () => {
            await waitForReset(testRateLimits.oauth.windowMs);

            const res = await request(app)
                .get('/v1/auth/google?linking=true&token=' + testToken)
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(302);
            expect(res.header.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fv1%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=566816162822-p10741tj0f33jfffv41qfgvpnhn75uam.apps.googleusercontent.com');
        });

        test('Blocks requests to OAuth unlinking route after exceeding limit', async () => {
            const responses = await sendDeleteRequests('/v1/auth/unlink/google', testToken, testRateLimits.oauth.limit + extraRequests);

            const allowedResponses = responses.slice(0, testRateLimits.oauth.limit);
            const blockedResponses = responses.slice(testRateLimits.oauth.limit);

            allowedResponses.forEach((res) => {
                expect(res.status).toBe(404); // No google account linked to the test user
                expect(res.body.message).toBe("No linked google account found for this user.");
            });

            blockedResponses.forEach((res) => {
                expect(res.status).toBe(429);
                expect(res.body.message).toBe("Too many OAuth unlinking attempts from this IP, please try again after " + testRateLimits.oauth.windowMs / 1000 + " seconds.");
            });
        });

        test('Unblocks OAuth unlinking route after cooldown period', async () => {
            await waitForReset(testRateLimits.oauth.windowMs);

            const res = await request(app)
                .delete('/v1/auth/unlink/google')
                .set('Authorization', `Bearer ${testToken}`)
                .set('X-Forwarded-For', testIP);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("No linked google account found for this user.");
        });
    });

    describe('User-Based Rate Limiting', () => {
        test('Allows different rate limits for different user roles', async () => {
            const [adminResponses, userResponses] = await Promise.all([
                sendRequests(testAdminIP, `/v1/api/users/${mockUsers[0].id}`, tokens.admin, testRateLimits.roles.admin.points + extraRequests),
                sendRequests(testUserIP, `/v1/api/users/${mockUsers[1].id}`, tokens.user, testRateLimits.roles.user.points + extraRequests)
            ]);

            // Check admin responses
            const allowedAdminResponses = adminResponses.slice(0, testRateLimits.roles.admin.points);
            const blockedAdminResponses = adminResponses.slice(testRateLimits.roles.admin.points);

            allowedAdminResponses.forEach((res) => {
                expect(res.status).toBe(200);
                expect(res.body.id).toBe(mockUsers[0].id);
            });

            blockedAdminResponses.forEach((res) => {
                expect(res.status).toBe(429); // Admin limit exceeded
            });

            // Check user responses
            const allowedUserResponses = userResponses.slice(0, testRateLimits.roles.user.points);
            const blockedUserResponses = userResponses.slice(testRateLimits.roles.user.points);

            allowedUserResponses.forEach((res) => {
                expect(res.status).toBe(200);
                expect(res.body.id).toBe(mockUsers[1].id);
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
            expect(adminRes.body.id).toBe(mockUsers[0].id);
            expect(userRes.status).toBe(200);
            expect(userRes.body.id).toBe(mockUsers[1].id);
        });
    });
});