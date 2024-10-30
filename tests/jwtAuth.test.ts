import request from 'supertest';
import { app, server } from '../src/app';
import { prisma } from '../src/config/prisma';
import { rateLimitBypassIp } from '../src/utils/constants';

//Helper functions to send requests
const sendPostRequest = async (endpoint: string, body: any, token: string | null) => {
	const res = await request(app)
		.post(endpoint)
		.send(body)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIp); // Simulate same IP
	return res;
}

const sendGetRequest = async (endpoint: string, token: string | null) => {
	const res = await request(app)
		.get(endpoint)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIp); // Simulate same IP
	return res;
}

describe("JWT Authentication Tests", () => {

	afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

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
				password: `ValidPass123`
			}, null);

			expect(res.statusCode).toBe(201);
			expect(res.body).toMatchObject({ user: expect.any(Object) });
		});

		test("Register with duplicate email", async () => {
			const res =await sendPostRequest("/v1/auth/register", {
				username: "duplicateEmailUser",
				email: "user@usermail.com", // A test email that is already registered in the database
				password: "ValidPass123"
			}, null);

			expect(res.statusCode).toBe(409);
			expect(res.body).toMatchObject({ message: "User already exists with provided email address." });
		});

		// Additional Validation Tests
		test("Register with missing username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				email: `newuser@example.com`,
				password: `ValidPass!`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username is required." });
		});

		test("Register with empty username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username cannot be empty. It is required." });
		});

		test("Register with short username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "ab",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username must be at least 6 characters long." });
		});

		test("Register with long username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "a".repeat(21),
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username cannot exceed 20 characters." });
		});

		test("Register with invalid characters in username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalid@username",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username must contain only letters and numbers." });
		});

		test("Register with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				password: `ValidPass!`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email is required." });
		});

		test("Register with empty email", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: "",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email cannot be empty. It is required." });
		});

		test("Register with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalidEmailUser",
				email: "notAnEmail",
				password: "ValidPass123!"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email must be a valid email address." });
		});

		test("Register with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: `newuser@example.com`
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password is required." });
		});

		test("Register with empty password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "emptyPassUser",
				email: "user@example.com",
				password: ""
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password cannot be empty. It is required." });
		});

		test("Register with short password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "weakPassUser",
				email: "user@example.com",
				password: "12345"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password must be at least 8 characters long." });
		});

		test("Register with invalid password format", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalidPassUser",
				email: "user@example.com",
				password: "password"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password must contain at least one uppercase letter, one lowercase letter, and one number." });
		})

		test("Register with long password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "longPassUser",
				email: "user@example.com",
				password: "ValidPassword12345678901234563hello"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password cannot exceed 30 characters." });
		});

		test("Register with empty role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123",
				role_name: ""
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name cannot be empty." });
		});

		test("Register with short role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123",
				role_name: "ab"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name must be at least 3 characters." });
		});

		test("Register with invalid characters in role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123",
				role_name: "invldRle3"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name must contain only letters." });
		});

		test("Register with long role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123",
				role_name: "a".repeat(11)
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name above 10 characters is invalid." });
		});
	});

	// Login Tests
	describe("User Login", () => {
		test("Login with valid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "User1234"
			}, null);

			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty("token");
		});

		test("Login with invalid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "invalidPassword123"
			}, null);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid password." });
		});

		test("Login with non-existent email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "nonExistentEmail@usermail.com",
				password: "User1234"
			}, null);

			expect(res.statusCode).toBe(404);
			expect(res.body).toMatchObject({ message: "User not found with provided email address." });
		});

		test("Login with OAuth account email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "amanagnihotri412002@gmail.com",
				password: "User1234"
			}, null);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "A social login account with this email address already exists." });
		});

		// Aditional Validation Tests
		test("Login with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email is required." });
		});

		test("Login with empty email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "",
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email cannot be empty. It is required." });
		});

		test("Login with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "notAnEmail",
				password: "user1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email must be a valid email address." });
		});

		test("Login with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password is required." });
		});

		test("Login with empty password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: ""
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password cannot be empty. It is required." });
		});

		test("Login with short password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "1234"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});

		test("Login with invalid password format", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "password"
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});

		test("Login with long password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "a".repeat(31)
			}, null);

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});
	});

	// JWT Token Validation
	describe("JWT Token Validation", () => {
		test("Expired token access", async () => {
			// Assuming token is generated with a short expiry time for testing
			const expiredToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMjd5a2lvZjAwMDAxMDJscGdkNjl1cXoiLCJpYXQiOjE3MzAwMjgzMzUsImV4cCI6MTczMDAyODYzNX0.yOqTslRMBkkF4uVdFeHttCIGbTkhsdxKKHWVU5b-KI_U3ON-iLKpn4DNa97kGMPsUvUqNf-SJ6aj4sd21A6TPw";

			const res = await sendGetRequest("/v1/api/", expiredToken);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Token has expired" });
		});

		test("Access without token", async () => {
			const res = await sendGetRequest("/v1/api/", null);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Unauthorized, please log in" });
		});

		test("Invalid (or malformed) token access", async () => {
			const invalidToken = "invalidToken";

			const res = await sendGetRequest("/v1/api/", invalidToken);

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Malformed token" });
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
				password: "User1234"
			}, null);

            expect(res.statusCode).toBe(500);
            expect(res.body).toMatchObject({ message: expect.any(String) });
        });
	});
});