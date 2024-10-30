import request from 'supertest';
import { app, server } from '../src/app';
import { prisma } from '../src/config/prisma';
import { rateLimitBypassIps } from '../src/utils/constants';

afterAll((done) => {
	server.close(done);
});

//Helper functions to send requests
const sendPostRequest = async (endpoint: string, body: any, token: string | null) => {
	const res = await request(app)
		.post(endpoint)
		.send(body)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIps); // Simulate same IP
	return res;
}

const sendGetRequest = async (endpoint: string, token: string | null) => {
	const res = await request(app)
		.get(endpoint)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIps); // Simulate same IP
	return res;
}

describe("JWT Authentication Tests", () => {

	// User Registration Tests
	describe("User Registration", () => {

		afterAll(async () => {
			// Clean up the database after testing
			const user = await prisma.users.findUnique({ where: { email: "newuser@example.com" } });

			// Ensure the user is freed of any roles
			await prisma.user_role.deleteMany({ where: { userId: user?.id } });

			// Permanently delete the user
			await prisma.users.delete({ where: { id: user?.id } });

		});

		test("Register with valid data", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: `newuser@example.com`,
				password: `ValidPass!`
			}, null);

			expect(res.statusCode).toBe(201);
			expect(res.body).toMatchObject({ user: expect.any(Object) });
		});

		test("Register with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalidEmailUser",
				email: "notAnEmail",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with weak password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "weakPassUser",
				email: "user@example.com",
				password: "12345"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with duplicate email", async () => {
			const res =await sendPostRequest("/v1/auth/register", {
				username: "duplicateEmailUser",
				email: "user@usermail.com", // A test email that is already registered in the database
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(409); // Conflict
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		// Additional Validation Tests
		test("Register with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				password: `ValidPass!`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: `newuser@example.com`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with missing username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				email: `newuser@example.com`,
				password: `ValidPass!`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with empty username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with short username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "ab",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with long username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "a".repeat(31),
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with invalid characters in username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalid@username",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with empty role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123!",
				role_name: ""
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with short role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123!",
				role_name: "ab"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Register with long role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123!",
				role_name: "a".repeat(11)
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});
	});

	// Login Tests
	describe("User Login", () => {
		test("Login with valid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty("token");
		});

		test("Login with invalid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "invalidPassword"
			}, null);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		// Aditional Validation Tests
		test("Login with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Login with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Login with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "notAnEmail",
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Login with short password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});
	});

	// JWT Token Validation
	describe("JWT Token Validation", () => {
		test("Expired token access", async () => {
			// Assuming token is generated with a short expiry time for testing
			const expiredToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMjd5a2lvZjAwMDAxMDJscGdkNjl1cXoiLCJpYXQiOjE3MzAwMjgzMzUsImV4cCI6MTczMDAyODYzNX0.yOqTslRMBkkF4uVdFeHttCIGbTkhsdxKKHWVU5b-KI_U3ON-iLKpn4DNa97kGMPsUvUqNf-SJ6aj4sd21A6TPw";

			const res = await sendGetRequest("/v1/api/", expiredToken);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Access without token", async () => {
			const res = await sendGetRequest("/v1/api/", null);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});

		test("Invalid (or malformed) token access", async () => {
			const invalidToken = "invalidToken";

			const res = await sendGetRequest("/v1/api/", invalidToken);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: expect.any(String) });
		});
	});

	describe("Error Handling", () => {
		test("Unexpected error handling", async () => {
			// Simulate an unexpected error
            jest.spyOn(prisma.users, 'findUnique').mockImplementationOnce(() => {
                throw new Error("Unexpected error");
            });

            const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "user1234"
			}, null);

            expect(res.statusCode).toBe(500);
            expect(res.body).toMatchObject({ message: expect.any(String) });
        });
	});
});