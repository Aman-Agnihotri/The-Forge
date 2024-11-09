import request from 'supertest';
import { app, server } from '../../src/app';
import { generateToken } from '../../src/utils/jwt';
import { rateLimitBypassIp } from '../../src/utils/constants';
import logger from '../../src/services/logger';

const testValidAdmin = 'cm2rsebh60000nurypn3p8i6r';
const testValidUser = 'cm2rsk2zw0004nury51slrgu0';
const testInvalidId = 'invalidRoleId';
const testNonExistentId = 'cm38whe1700010cl40ydv04ry';

const adminRoleId = "cm2rsbz130000mvhqnb7piesf";
let testRoleId: string;

const adminToken = generateToken(testValidAdmin);
const userToken = generateToken(testValidUser);

describe('Role Routes Tests', () => {
    const loggerSpyInfo = jest.spyOn(logger, 'info');
    const loggerSpyDebug = jest.spyOn(logger, 'debug');

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    describe('GET /api/roles', () => {

        afterEach(() => {
            loggerSpyDebug.mockClear();
            loggerSpyInfo.mockClear();
        });

        test('Admin can fetch all roles', async () => {

            const res = await request(app)
                .get('/v1/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
                
            expect(loggerSpyDebug).toHaveBeenCalledWith('Roles fetched successfully.');
            expect(loggerSpyInfo).not.toHaveBeenCalled();
        
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('length', 2);
        });

        test('Non-admin cannot fetch roles', async () => {
            const res = await request(app)
                .get('/v1/api/roles')
                .set('Authorization', `Bearer ${userToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });
    });

    describe('GET /api/roles/:id', () => {

        afterEach(() => {
            loggerSpyDebug.mockClear();
            loggerSpyInfo.mockClear();
        });

        test('Admin can fetch a role by ID', async () => {

            const res = await request(app)
                .get(`/v1/api/roles/${adminRoleId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`Role with id '${adminRoleId}' fetched successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', adminRoleId);
        });

        test('Invalid role ID format', async () => {
            const res = await request(app)
                .get(`/v1/api/roles/${testInvalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role fetching failed. Invalid role ID format: ${testInvalidId}`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid role ID format.');
        });

        test('Role not found', async () => {

            const res = await request(app)
                .get(`/v1/api/roles/${testNonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
                
            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role fetching failed. Role with id '${testNonExistentId}' not found.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Role not found.');
        });

        test('Non-admin cannot fetch role by ID', async () => {
            const res = await request(app)
                .get(`/v1/api/roles/${adminRoleId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });
    });

    describe('POST /api/roles', () => {

        afterEach(() => {
            loggerSpyDebug.mockClear();
            loggerSpyInfo.mockClear();
        });

        test('Admin can create a new role', async () => {

            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'testRole' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`Role 'testRole' created successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            testRoleId = res.body.id;
        });

        test('Role name not provided', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role creation failed. Invalid request body.\nError: Role name is required.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name is required.');
        });

        test('Empty role name provided', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: '' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith('Role creation failed. Invalid request body.\nError: Role name cannot be empty.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name cannot be empty.');
        });

        test('Role name too short', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'ab' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role creation failed. Invalid request body.\nError: Role name must be at least 3 characters long.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name must be at least 3 characters long.');
        });

        test('Invalid role name format', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'test25@%' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role creation failed. Invalid request body.\nError: Role name can only contain letters.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name can only contain letters.');
        });

        test('Role name too long', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'a'.repeat(11) })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role creation failed. Invalid request body.\nError: Role name cannot exceed 10 characters.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name cannot exceed 10 characters.');
        });

        test('Role already exists', async () => {

            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'Admin' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role creation failed. Role with name 'Admin' already exists.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(409);
            expect(res.body.message).toBe('Role already exists.');
        });

        test('Non-admin cannot create a role', async () => {
            const res = await request(app)
                .post('/v1/api/roles')
                .send({ name: 'testRole' })
                .set('Authorization', `Bearer ${userToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });
    });

    describe('PUT /api/roles/:id', () => {

        afterEach(() => {
            loggerSpyDebug.mockClear();
            loggerSpyInfo.mockClear();
        });

        test('Admin can update a role', async () => {

            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'updateRole' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
                    
            expect(loggerSpyDebug).toHaveBeenCalledWith(`Role with id '${testRoleId}' updated successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', testRoleId);
        });

        test('Invalid role ID format', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testInvalidId}`)
                .send({ name: 'updateRole' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role update failed. Invalid role ID format: ${testInvalidId}`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid role ID format.');
        });

        test('Role name not provided', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({  })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role update failed. Invalid request body.\nError: Role name is required.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name is required.');
        });

        test('Empty role name provided', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: '' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role update failed. Invalid request body.\nError: Role name cannot be empty.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name cannot be empty.');
        });

        test('Role name too short', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'ab' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role update failed. Invalid request body.\nError: Role name must be at least 3 characters long.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name must be at least 3 characters long.');
        });

        test('Invalid role name format', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'test25@%' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role update failed. Invalid request body.\nError: Role name can only contain letters.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name can only contain letters.');
        });

        test('Role name too long', async () => {    
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'a'.repeat(11) })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith('Role update failed. Invalid request body.\nError: Role name cannot exceed 10 characters.');
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name cannot exceed 10 characters.');
        });

        test('Role not found', async () => {

            const res = await request(app)
                .put(`/v1/api/roles/${testNonExistentId}`)
                .send({ name: 'updateRole' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
                
            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role update failed. Role with id '${testNonExistentId}' not found.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Role not found.');
        });

        test('Role name is the same as before', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'updateRole' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role with id '${testRoleId}' not updated. Role name is the same as before.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Role name is the same as before.');
        });

        test('Role already exists', async () => {

            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'Admin' })
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role update failed. Role with name 'Admin' already exists.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(409);
            expect(res.body.message).toBe('Role already exists.');
        });

        test('Non-admin cannot update a role', async () => {
            const res = await request(app)
                .put(`/v1/api/roles/${testRoleId}`)
                .send({ name: 'updateRole' })
                .set('Authorization', `Bearer ${userToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });
    });

    describe('DELETE /api/roles/:id', () => {

        afterEach(() => {
            loggerSpyDebug.mockClear();
            loggerSpyInfo.mockClear();
        });

        test('Admin can delete a role', async () => {

            const res = await request(app)
                .delete(`/v1/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyDebug).toHaveBeenCalledWith(`Role 'updateRole' deleted successfully.`);
            expect(loggerSpyInfo).not.toHaveBeenCalled();
            
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Role deleted successfully.');
        });

        test('Invalid role ID format', async () => {
            const res = await request(app)
                .delete(`/v1/api/roles/${testInvalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);

            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role deletion failed. Invalid role ID format: ${testInvalidId}`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);
            
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid role ID format.');
        });

        test('Role not found', async () => {

            const res = await request(app)
                .delete(`/v1/api/roles/${testNonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
    
            expect(loggerSpyInfo).toHaveBeenCalledWith(`Role deletion failed. Role with id '${testNonExistentId}' not found.`);
            expect(loggerSpyDebug).toHaveBeenCalledTimes(5);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Role not found.');
        });

        test('Non-admin cannot delete a role', async () => {
            const res = await request(app)
                .delete(`/v1/api/roles/${testRoleId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .set('X-Forwarded-For', rateLimitBypassIp);
            
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access denied.');
        });
    });
});