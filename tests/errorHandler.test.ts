import request from 'supertest';
import { app, server } from '../src/app';
import { prisma } from '../src/config/prisma';
import { rateLimitBypassIp } from '../src/utils/constants';
import { Prisma } from '@prisma/client';
import { generateToken } from '../src/utils/jwt';
import logger from '../src/utils/logger';

const testValidId = 'cm2rsk2zw0004nury51slrgu0';

// Helper function to send requests
const sendPostRequest = async (endpoint: string, body: any, token: string | null) => {
    const res = await request(app)
        .post(endpoint)
        .send(body)
        .set('Authorization', token ? `Bearer ${token}` : '')
        .set('X-Forwarded-For', rateLimitBypassIp);
    return res;
}

// Helper function to send DELETE requests
const sendGetRequest = async (endpoint: string, token: string | null) => {
  const res = await request(app)
    .get(endpoint)
    .set('Authorization', token ? `Bearer ${token}` : '')
    .set('X-Forwarded-For', rateLimitBypassIp);
  return res;
};

describe('Error Handling', () => {
  let testToken: string;

  beforeAll(async () => {
    testToken = generateToken(testValidId);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('Prisma error handling', async () => {
    // Create a mock Prisma error (e.g., P2003 - Foreign key constraint failed)
    const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `some_field`',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
          meta: {},
        }
      );

    // Spy on the logger.error method
    const loggerSpy = jest.spyOn(logger, 'warn');

    // Mock prisma.users.findUnique to throw the Prisma error
    jest.spyOn(prisma.users, 'findUnique').mockImplementationOnce(() => {
        throw prismaError;
    });

    const res = await sendGetRequest(`/v1/api/`, testToken);

    // Assertions on the response
    expect(res.statusCode).toBe(500); // Since we haven't specifically handled P2003, it should return 500
    expect(res.body).toMatchObject({
      message: 'An error occurred during authentication.',
    });

    // Assertions on the logger
    expect(loggerSpy).toHaveBeenCalledWith(
      `Prisma Error [${prismaError.code}]: ${prismaError.message}`,
      {
        method: 'GET',
        path: `/v1/api/`,
        status: 500,
        prismaCode: prismaError.code,
        stack: expect.any(String),
      });

    // Restore mocks and spies
    jest.restoreAllMocks();
  });

  test("General error handling", async () => {
    // Simulate a general error (not a Prisma error)
    jest.spyOn(prisma.users, 'findUnique').mockImplementationOnce(() => {
        throw new Error("Unexpected error");
    });

    // Spy on the logger.error method
    const loggerSpy = jest.spyOn(logger, 'warn');

    const res = await sendPostRequest("/v1/auth/login", {
        email: "user@usermail.com",
        password: "User1234"
    }, null);

    // Assertions on the response
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ message: "An error occurred while logging in." });

    // Assertions on the logger
    expect(loggerSpy).toHaveBeenCalledWith(
        `Error occurred: An error occurred while logging in.`,
        expect.objectContaining({
            method: 'POST',
            path: '/v1/auth/login',
            status: 500,
            stack: expect.any(String),
        })
    );

    // Restore mocks and spies
    jest.restoreAllMocks();
  });
});