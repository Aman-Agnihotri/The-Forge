import request from 'supertest';
import { app, server } from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { testIP } from '../src/utils/constants';
import logger from '../src/utils/logger';

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
		.set('X-Forwarded-For', testIP);
	return res;
}

const sendGetRequest = async (endpoint: string, token: string | null) => {
	const res = await request(app)
		.get(endpoint)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', testIP);
	return res;
}

describe('Role-Based Access Control (RBAC) Tests', () => {

    const loggerSpyInfo = jest.spyOn(logger, 'info');
	const loggerSpyDebug = jest.spyOn(logger, 'debug');

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    describe('Admin-only routes', () => {

        afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});
        
        test('Admin should access admin-only route', async () => {
            const res = await sendGetRequest('/v1/api/users', tokens.admin);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`User '${mockUsers[0].id}' authorized with roles: ${mockUsers[0].roles.map((role: any) => role.role.name).join(', ')}`);
            expect(loggerSpyDebug).toHaveBeenCalledWith(`Users fetched successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("length", 4);
        });

        test('User should be denied access to admin-only route', async () => {
            const res = await sendGetRequest('/v1/api/users', tokens.user1);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Access denied: User '${mockUsers[1].id}' has insufficient permissions.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(2); // 1 for protected route, 1 for user route. Info message is logged in role middleware.
            
            expect(res.status).toBe(403); 
            expect(res.body.message).toBe('Access denied.');
        });

        test('User with no roles should be denied access to admin-only route', async () => {
            const res = await sendGetRequest('/v1/api/users', tokens.noRole);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Access denied: User has no roles assigned. User ID: ${mockUsers[3].id}, IP: ${testIP}`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(1); // 1 for protected route. Info message is logged in rate limit middleware.
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });

        test('Unauthenticated user should be denied access to admin-only route', async () => {
            const res = await sendGetRequest('/v1/api/users', null);

            expect(loggerSpyInfo).toHaveBeenCalledWith("Unauthorized access: No authentication token provided.");
            expect(loggerSpyDebug).not.toHaveBeenCalled();
            
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Unauthorized, please log in.');
        });
    });

    describe('Admin or User route', () => {

        afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});
        
        test('Admin should access route accessible to admin or user', async () => {
            const res = await sendGetRequest(`/v1/api/users/${mockUsers[0].id}`, tokens.admin);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`User '${mockUsers[0].id}' authorized with roles: ${mockUsers[0].roles.map((role: any) => role.role.name).join(', ')}`);
            expect(loggerSpyDebug).toHaveBeenCalledWith(`User 'undefined' fetched successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(200); 
            expect(res.body.id).toBe(mockUsers[0].id);
        });

        test('User should access route accessible to admin or user', async () => {
            const res = await sendGetRequest(`/v1/api/users/${mockUsers[1].id}`, tokens.user1);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`User '${mockUsers[1].id}' authorized with roles: ${mockUsers[1].roles.map((role: any) => role.role.name).join(', ')}`);
            expect(loggerSpyDebug).toHaveBeenCalledWith(`User 'undefined' fetched successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(200); 
            expect(res.body.id).toBe(mockUsers[1].id);
        });

        test('User with no roles should be denied access', async () => {
            const res = await sendGetRequest(`/v1/api/users/${mockUsers[3].id}`, tokens.noRole);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Access denied: User has no roles assigned. User ID: ${mockUsers[3].id}, IP: ${testIP}`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(1); // 1 for protected route. Info message is logged in rate limit middleware.
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });

        test('Unauthenticated user should be denied access', async () => {
            const res = await sendGetRequest(`/v1/api/users/${mockUsers[3].id}`, null);

            expect(loggerSpyInfo).toHaveBeenCalledWith("Unauthorized access: No authentication token provided.");
            expect(loggerSpyDebug).not.toHaveBeenCalled();
            
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Unauthorized, please log in.');
        })
    });
    
    describe('Role Modification', () => {

        afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});

        test('Admin should modify user role successfully', async () => {

            const res1 = await sendGetRequest(`/v1/api/users/`, tokens.user1);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Access denied: User '${mockUsers[1].id}' has insufficient permissions.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(2); // 1 for protected route, 1 for user route. Info message is logged in role middleware.

            expect(res1.status).toBe(403);
            expect(res1.body.message).toBe('Access denied.');

            loggerSpyInfo.mockClear();
            loggerSpyDebug.mockClear();

            // Modify user role
            const res2 = await sendPutRequest(`/v1/api/users/${mockUsers[1].id}`, { role_name: 'admin' }, tokens.admin);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`User '${mockUsers[0].id}' authorized with roles: admin`);
            expect(loggerSpyDebug).toHaveBeenCalledWith(`User 'undefined' updated successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();

            expect(res2.status).toBe(200);
            expect(res2.body.id).toBe(mockUsers[1].id);
            expect(mockUsers[1].roles[1].role.name).toBe('admin');

            // Refresh token for the modified user
            tokens.user1 = generateToken(mockUsers[1].id);
        });

        test('Modified role should grant admin access to previously restricted routes', async () => {

            const res = await sendGetRequest('/v1/api/users', tokens.user1);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`User '${mockUsers[1].id}' authorized with roles: ${mockUsers[1].roles.map((role: any) => role.role.name).join(', ')}`);
            expect(loggerSpyDebug).toHaveBeenCalledWith(`Users fetched successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("length", 4);
        });

        test('Non-admin user should be denied role modification access', async () => {

            const res = await sendPutRequest(`/v1/api/users/${mockUsers[2].id}`, { role_name: 'admin' }, tokens.user2);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`User with id '${mockUsers[2].id}' tried to update their own role. This action is not allowed.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(4); // 1 for protected route, 1 for user route, 1 for role middleware, 1 for user update route request. Info message is logged in user update route controller.
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Self role update is not allowed.');
        });
    });
});