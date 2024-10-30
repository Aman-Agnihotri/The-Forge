import request from 'supertest';
import { app, server } from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { testIP } from '../src/utils/constants';

afterAll((done) => {
  server.close(done);
});

// Mock user data for testing
const mockUsers = [
    { id: 'cm2ust9kd00090cjp97y37jbb', roles: [{ role: { id: 'cm2ustylt000c0cjpfutd2lzl', name: 'admin' } }] },  // Admin user
    { id: 'cm2usvs7v000e0cjpfwam08rh', roles: [{ role: { id: 'cm2usu59l000d0cjpbythal9r', name: 'user' } }] },   // Regular user1
    { id: 'cm2vibb5300000clb1e65crty', roles: [{ role: { id: 'cm2vibnbx00010clb7v0qg7xu', name: 'user' } }] },   // Regular user2
    { id: 'cm2ustou3000b0cjp74qx7ynm', roles: [] }                                                               // No role assigned
];

// Generate tokens for each mock user
const tokens = {
    admin: generateToken(mockUsers[0].id),
    user1: generateToken(mockUsers[1].id),
    user2: generateToken(mockUsers[2].id),
    noRole: generateToken(mockUsers[3].id)
};

// Mock Prisma calls
jest.mock('../src/config/prisma', () => ({
    prisma: {
        users: {
            findUnique: jest.fn().mockImplementation(({ where: { id } }) =>
                mockUsers.find((user) => user.id === id) || null
            ),
            findMany: jest.fn().mockImplementation(() => mockUsers),
            update: jest.fn(({ data, where: { id } }) => {
                const user = mockUsers.find((user) => user.id === id);
                if (user) {
                    if (data.roles) {
                        user.roles = data.roles.set.map((role: any) => ({ role: { name: role.name } }));
                    }
                }
                return user;
            }),
        }, 
        roles: {
            findUnique: jest.fn(({ where: { name } }) => {
                const roles = [{ id: '1', name: 'admin' }, { id: '2', name: 'user' }];
                return roles.find((role) => role.name === name) || null;
            }),
        },
        user_role: {
            findFirst: jest.fn(({ where: { userId, roleId } }) => {
                const userRole = mockUsers.find((user) => user.id === userId)?.roles.find((role) => role.role.id === roleId);
                return userRole || null;
            }),
            create: jest.fn(({ data: { userId, roleId } }) => {
                const user = mockUsers.find((user) => user.id === userId);
                const role = { id: roleId, name: roleId === '1' ? 'admin' : 'user' };
                if (user) {
                    user.roles.push({ role });
                }
                return { userId, roleId };
            }),
        },
    }
}));

//Helper functions to send requests
const sendPutRequest = async (endpoint: string, body: any, token: string | null) => {
	const res = await request(app)
		.put(endpoint)
		.send(body)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', testIP); // Simulate same IP
	return res;
}

const sendGetRequest = async (endpoint: string, token: string | null) => {
	const res = await request(app)
		.get(endpoint)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', testIP); // Simulate same IP
	return res;
}

describe('Role-Based Access Control (RBAC) Tests', () => {

    describe('Admin-only routes', () => {
        
        test('Admin should access admin-only route', async () => {

            const res = await sendGetRequest('/v1/api/users', tokens.admin);  // Admin-only route

            expect(res.status).toBe(200); // Successful access returns status 200
            expect(res.body).toHaveProperty("length", 4); // Assuming 4 users are returned
        });

        test('User should be denied access to admin-only route', async () => {

            const res = await sendGetRequest('/v1/api/users', tokens.user1);
            
            expect(res.status).toBe(403); 
            expect(res.body.message).toBe('Access denied: insufficient permissions');
        });

        test('Unauthenticated user should be denied access to admin-only route', async () => {
            const res = await sendGetRequest('/v1/api/users', null); // No auth header
            
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Unauthorized, please log in');
        });
    });

    describe('Admin or User route', () => {
        
        test('Admin should access route accessible to admin or user', async () => {

            const res = await sendGetRequest(`/v1/api/users/${mockUsers[0].id}`, tokens.admin);  // Route accessible to admin and user
            
            expect(res.status).toBe(200); 
            expect(res.body).toHaveProperty("id");
        });

        test('User should access route accessible to admin or user', async () => {

            const res = await sendGetRequest(`/v1/api/users/${mockUsers[1].id}`, tokens.user1);
            
            expect(res.status).toBe(200); 
            expect(res.body).toHaveProperty("id");
        });

        test('User with no roles should be denied access', async () => {

            const res = await sendGetRequest(`/v1/api/users/${mockUsers[3].id}`, tokens.noRole);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied: User has no roles assigned');
        });
    });
    
    describe('Role Modification', () => {

        test('Admin should modify user role successfully', async () => {

            const res = await sendPutRequest(`/v1/api/users/${mockUsers[1].id}`, { role_name: 'admin' }, tokens.admin);  // Endpoint for updating roles
                        
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("id");
            expect(mockUsers[1].roles[1].role.name).toBe('admin'); // Confirm role change

            // Refresh token for the modified user
            tokens.user1 = generateToken(mockUsers[1].id);
        });

        test('Modified role should grant admin access to previously restricted routes', async () => {

            const res = await sendGetRequest('/v1/api/users', tokens.user1);
            
            expect(res.status).toBe(200); // Expect success as user now has admin role
        });

        test('Non-admin user should be denied role modification access', async () => {

            const res = await sendPutRequest(`/v1/api/users/${mockUsers[2].id}`, { role_name: 'admin' }, tokens.user2);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('You do not have permission to update the role of a user. Please contact an admin for additional help.');
        });
    });
});