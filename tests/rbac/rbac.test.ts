import request from 'supertest';
import { app, server } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';

afterAll((done) => {
  server.close(done);
});

// Mock user data for testing
const mockUsers = [
    { id: '1', roles: [{ role: { id: '1', name: 'admin' } }] },  // Admin user
    { id: '2', roles: [{ role: { id: '2', name: 'user' } }] },   // Regular user
    { id: '3', roles: [] }                              // No role assigned
];

// Generate tokens for each mock user
const tokens = {
    admin: generateToken(mockUsers[0].id),
    user: generateToken(mockUsers[1].id),
    noRole: generateToken(mockUsers[2].id)
};

// Mock Prisma calls
jest.mock('../../src/config/prisma', () => ({
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

describe('Role-Based Access Control (RBAC) Tests', () => {

    describe('Admin-only routes', () => {
        
        test('Admin should access admin-only route', async () => {

            const res = await request(app)
                .get('/v1/api/users')  // Admin-only route
                .set('Authorization', `Bearer ${tokens.admin}`);

            expect(res.status).toBe(200); // Successful access returns status 200
            expect(res.body).toHaveProperty("length", 3); // Assuming 3 users are returned
        });

        test('User should be denied access to admin-only route', async () => {
            const res = await request(app)
                .get('/v1/api/users')
                .set('Authorization', `Bearer ${tokens.user}`);
            
            expect(res.status).toBe(403); 
            expect(res.body.message).toBe('Access denied: insufficient permissions');
        });

        test('Unauthenticated user should be denied access to admin-only route', async () => {
            const res = await request(app).get('/v1/api/users'); // No auth header
            
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Unauthorized, please log in');
        });
    });

    describe('Admin or User route', () => {
        
        test('Admin should access route accessible to admin or user', async () => {
            const res = await request(app)
                .get('/v1/api/users/1')  // Route accessible to admin and user
                .set('Authorization', `Bearer ${tokens.admin}`);
            
            expect(res.status).toBe(200); 
            expect(res.body).toHaveProperty("id");
        });

        test('User should access route accessible to admin or user', async () => {
            const res = await request(app)
                .get('/v1/api/users/2')
                .set('Authorization', `Bearer ${tokens.user}`);
            
            expect(res.status).toBe(200); 
            expect(res.body).toHaveProperty("id");
        });

        test('User with no roles should be denied access', async () => {
            const res = await request(app)
                .get('/v1/api/users/3')
                .set('Authorization', `Bearer ${tokens.noRole}`);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied: User has no roles assigned');
        });
    });
    
    describe('Role Modification', () => {

        test('Admin should modify user role successfully', async () => {
            const res = await request(app)
                .put('/v1/api/users/2')  // Endpoint for updating roles
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({ role_name: 'admin' }); // Assign new role
                        
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("id");
            expect(mockUsers[1].roles[1].role.name).toBe('admin'); // Confirm role change

            // Refresh token for the modified user
            tokens.user = generateToken(mockUsers[1].id);
        });

        test('Modified role should grant admin access to previously restricted routes', async () => {
            const res = await request(app)
                .get('/v1/api/users')  // Admin-only route
                .set('Authorization', `Bearer ${tokens.user}`);
            
            expect(res.status).toBe(200); // Expect success as user now has admin role
        });

        test('Non-admin user should be denied role modification access', async () => {
            const res = await request(app)
                .put('/v1/api/users/3')
                .set('Authorization', `Bearer ${tokens.noRole}`)
                .send({ role_name: 'admin' });
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied: User has no roles assigned');
        });
    });
});