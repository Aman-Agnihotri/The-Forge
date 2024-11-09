import request from 'supertest';
import { app, server } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { generateRefreshToken, generateToken } from '../../src/utils/jwt';
import { rateLimitBypassIp } from '../../src/utils/constants';
import logger from '../../src/utils/logger';

const testValidId = 'cm2rsk2zw0004nury51slrgu0';

// Invalid tokens for testing with no expiration (no confidential data)
const accessTokenHasString = "eyJhbGciOiJIUzUxMiJ9.SGFpbiwgaGF1bHU.D7w-veXI7pv5DxT6x5vRDlQp92jn5uzyEu5IMQU1ydl-ARSCVX3L3W4EZsR6NAwqZnHAMloMVNpGRc6Q6KtUEQ";

const accessTokenNotWithId = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3RVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzMwMzE2MDcyfQ.tSM-EiAaS0C6yN_T1gqTtwAfaD4wdPCuqkzzuH5xWnozUd4Ul7H9VzCa-8xHTzpSO1-H_lEmaRI5XnSoawvu6w";

const accessTokenWithInvalidId = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMnc5dW01NTAwMDAwY21uMDF5azFvZGYiLCJpYXQiOjE3MzAzMTcwMDl9.eS_aeOyNN7s-jYYQ6loot18Xng3JcYnIGSbWOUaadqnjiyQJGxRZUYUSnuWc358xJ75wrA6gXNgM_u3152lslQ";

const accessTokenWithInvalidSecret = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMnJzazJ6dzAwMDRudXJ5NTFzbHJndTAiLCJpYXQiOjE3MzAzNTA0NjB9.ASIJTksSvFjfp9YteDLcy0Hye2HsW_JIriNAuFt5TfjW6Piy7Eds8xoE8pGwbb13zQ5LSC6RjiS-CimkhwQEVQ";

const refreshTokenHasString = "eyJhbGciOiJIUzUxMiJ9.SGFpbiwgaGF1bHU.ASv6t7ff23nmJYE7QpwYJrsmXxmeKRmzjwr7D6yMBiW0vhdFyLKuT0HVGUheQr3PHOebdkLWuizSQ0c8qXiKvA";

const refreshTokenNotWithId = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3RVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzMwMzE2MDcyfQ.db6jkyZ8DbLnh3bgTKUXcdD9MP2UBYFEux_vh8nAjsO1q3DdmAgVIXWEvGQR3SgA86cvYRzWMvlQUa9edic-aA";

const refreshTokenWithInvalidId = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMnc5dW01NTAwMDAwY21uMDF5azFvZGYiLCJpYXQiOjE3MzAzMTcwMDl9.Z9DM__C5FbwDiM7mjjam5FKGRmyvnmRcfxE3LC9eypfohHU0qsbgKM055v24r1HsDY_770jodTZxMTLZOi5-Kw";

const refreshTokenWithInvalidSecret = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMnJzazJ6dzAwMDRudXJ5NTFzbHJndTAiLCJpYXQiOjE3MzAzNTA0NjB9.u-a2qczeYmJk4rLZDSaZODmwF9Y4qx8Rmzdn7UJj0rYoC8nVcedxPJaep2pm9WieTrtaaCbRl48QEq0vvFVZ9Q";

//Helper functions to send requests
const sendPostRequest = async (endpoint: string, body: any, token: string | null) => {
	const res = await request(app)
		.post(endpoint)
		.send(body)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIp);
	return res;
}

const sendGetRequest = async (endpoint: string, token: string | null) => {
	const res = await request(app)
		.get(endpoint)
		.set('Authorization', token ? `Bearer ${token}` : '')
		.set('X-Forwarded-For', rateLimitBypassIp);
	return res;
}

describe("JWT Authentication Tests", () => {

	const loggerSpyInfo = jest.spyOn(logger, 'info');
	const loggerSpyDebug = jest.spyOn(logger, 'debug');

	afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

	describe("User Registration", () => {

		afterAll(async () => {
			// Clean up the database after testing
			const user = await prisma.users.findUnique({ where: { email: "newuser@example.com" } });

			// Ensure the user is freed of any roles
			await prisma.user_role.deleteMany({ where: { userId: user?.id } });

			// Permanently delete the user
			await prisma.users.delete({ where: { id: user?.id } });

		});

		afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});

		test("Register with valid data", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: `newuser@example.com`,
				password: `ValidPass123`
			}, null);

			expect(loggerSpyDebug).toHaveBeenCalledWith(`User 'newuser' registered successfully with email 'newuser@example.com'.`);
			expect(loggerSpyInfo).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(201);
			expect(res.body).toMatchObject({ user: expect.any(Object) });
		});

		test("Register with duplicate email", async () => {
			const res =await sendPostRequest("/v1/auth/register", {
				username: "duplicateEmailUser",
				email: "user@usermail.com", // A test email that is already registered in the database
				password: "ValidPass123"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. User already exists with email: user@usermail.com`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(409);
			expect(res.body).toMatchObject({ message: "User already exists with provided email address." });
		});

		// Additional Validation Tests
		test("Register with missing username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				email: `newuser@example.com`,
				password: `ValidPass!`
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Username is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username is required." });
		});

		test("Register with empty username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Username cannot be empty. It is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username cannot be empty. It is required." });
		});

		test("Register with short username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "ab",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Username must be at least 6 characters long.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username must be at least 6 characters long." });
		});

		test("Register with long username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "a".repeat(21),
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Username cannot exceed 20 characters.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username cannot exceed 20 characters." });
		});

		test("Register with invalid characters in username", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalid@username",
				email: "user@example.com",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Username must contain only letters and numbers.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Username must contain only letters and numbers." });
		});

		test("Register with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				password: `ValidPass!`
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Email is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email is required." });
		});

		test("Register with empty email", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: "",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Email cannot be empty. It is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email cannot be empty. It is required." });
		});

		test("Register with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalidEmailUser",
				email: "notAnEmail",
				password: "ValidPass123!"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Email must be a valid email address.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email must be a valid email address." });
		});

		test("Register with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: `newuser`,
				email: `newuser@example.com`
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Password is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password is required." });
		});

		test("Register with empty password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "emptyPassUser",
				email: "user@example.com",
				password: ""
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Password cannot be empty. It is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password cannot be empty. It is required." });
		});

		test("Register with short password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "weakPassUser",
				email: "user@example.com",
				password: "12345"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Password must be at least 8 characters long.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password must be at least 8 characters long." });
		});

		test("Register with invalid password format", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "invalidPassUser",
				email: "user@example.com",
				password: "password"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Password must contain at least one uppercase letter, one lowercase letter, and one number.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password must contain at least one uppercase letter, one lowercase letter, and one number." });
		})

		test("Register with long password", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "longPassUser",
				email: "user@example.com",
				password: "ValidPassword12345678901234563hello"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Password cannot exceed 30 characters.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

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

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Role name cannot be empty.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

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

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Role name must be at least 3 characters long.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name must be at least 3 characters long." });
		});

		test("Register with invalid characters in role name", async () => {
			const res = await sendPostRequest("/v1/auth/register", {
				username: "validUser",
				email: "user@example.com",
				password: "ValidPass123",
				role_name: "invldRle3"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Role name must contain only letters.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

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

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User registration failed. Invalid request body.\nError: Role name above 10 characters is invalid.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Role name above 10 characters is invalid." });
		});
	});

	describe("User Login", () => {

		afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});

		test("Login with valid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "User1234"
			}, null);

			expect(loggerSpyDebug).toHaveBeenCalledWith(`User 'testuser' logged in successfully with email 'user@usermail.com'.`);
			expect(loggerSpyInfo).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(200);
			expect(res.body).toHaveProperty("token");
		});

		test("Login with invalid credentials", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "invalidPassword123"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid password for user 'user@usermail.com'.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid password." });
		});

		test("Login with non-existent email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "nonExistentEmail@usermail.com",
				password: "User1234"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. User not found with email 'nonExistentEmail@usermail.com'.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid email or password." });
		});

		test("Login with OAuth account email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "amanagnihotri412002@gmail.com",
				password: "User1234"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. A social login account with 'amanagnihotri412002@gmail.com' email address already exists.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid email or password." });
		});

		// Aditional Validation Tests
		test("Login with missing email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				password: "user1234"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Email is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email is required." });
		});

		test("Login with empty email", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "",
				password: "user1234"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Email cannot be empty. It is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Email cannot be empty. It is required." });
		});

		test("Login with invalid email format", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "notAnEmail",
				password: "user1234"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Email must be a valid email address.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid email or password." });
		});

		test("Login with missing password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Password is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password is required." });
		});

		test("Login with empty password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: ""
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Password cannot be empty. It is required.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Password cannot be empty. It is required." });
		});

		test("Login with short password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "1234"
			}, null);
			
			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Invalid Password.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});

		test("Login with invalid password format", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "password"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Invalid Password.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});

		test("Login with long password", async () => {
			const res = await sendPostRequest("/v1/auth/login", {
				email: "user@usermail.com",
				password: "a".repeat(31)
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`User login failed. Invalid request body.\nError: Invalid Password.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Invalid Password." });
		});

	});

	describe("JWT Token Validation", () => {

		afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});

		test("Access with valid token", async () => {
			const testAccessToken = generateToken(testValidId);

			const res = await sendGetRequest("/v1/api/", testAccessToken);

			expect(loggerSpyDebug).not.toHaveBeenCalled;
			expect(loggerSpyInfo).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(200);
			// Expect to have a entity object named "userinfo" in the response body object
			expect(res.body).toMatchObject(...[{ userinfo: expect.any(Object) }]);
			
		});

		test("Access without token", async () => {
			const res = await sendGetRequest("/v1/api/", null);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Unauthorized access: No authentication token provided.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Unauthorized, please log in." });
		});
		
		test("Expired token access", async () => {
			const expiredToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMjd5a2lvZjAwMDAxMDJscGdkNjl1cXoiLCJpYXQiOjE3MzAwMjgzMzUsImV4cCI6MTczMDAyODYzNX0.yOqTslRMBkkF4uVdFeHttCIGbTkhsdxKKHWVU5b-KI_U3ON-iLKpn4DNa97kGMPsUvUqNf-SJ6aj4sd21A6TPw";

			const res = await sendGetRequest("/v1/api/", expiredToken);

			expect(loggerSpyInfo).toHaveBeenCalledWith(expect.stringContaining(`Authentication failed. Token expired. \nExpiredAt: `));
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			// Check to see if the date in the log call is valid
			const logCall = loggerSpyInfo.mock.calls.find(call => (call[0] as string).includes('ExpiredAt: '));
			if (logCall) {
				const dateString = (logCall[0] as string).split('ExpiredAt: ')[1];
				const date = new Date(dateString);
				expect(date.toString()).not.toBe('Invalid Date');
			}

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired access token." });
		});

		test("Malformed token access", async () => {
			const invalidToken = "malformedToken";

			const res = await sendGetRequest("/v1/api/", invalidToken);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Authentication failed. Malformed token.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired access token." });
		});

		test("Invalid token payload access", async () => {

			const res1 = await sendGetRequest("/v1/api/", accessTokenHasString);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Authentication failed. Invalid token payload: "Hain, haulu"`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res1.statusCode).toBe(401);
			expect(res1.body).toMatchObject({ message: "Invalid or expired access token." });

			loggerSpyInfo.mockClear();

			const res2 = await sendGetRequest("/v1/api/", accessTokenNotWithId);

			const expectedPayload = {
				username: "testUser",
				email: "test@example.com",
				iat: 1730316072
			};

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Authentication failed. Invalid token payload: ${JSON.stringify(expectedPayload)}`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res2.statusCode).toBe(401);
			expect(res2.body).toMatchObject({ message: "Invalid or expired access token." });

		});

		test("User in token not found", async () => {
			const res = await sendGetRequest("/v1/api/", accessTokenWithInvalidId);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Authentication failed. User with ID cm2w9um5500000cmn01yk1odf not found. `);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired access token." });
		});

		test("Invalid token signature access", async () => {

			const res = await sendGetRequest("/v1/api/", accessTokenWithInvalidSecret);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Authentication failed. Invalid token signature.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired access token." });
		});
	});

	describe("Refresh Token Tests", () => {

		afterEach(() => {
			loggerSpyDebug.mockClear();
			loggerSpyInfo.mockClear();
		});

		test("Refresh token with valid refresh token", async () => {

			const testRefreshToken = generateRefreshToken(testValidId);

			const res = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: testRefreshToken
			}, null);

			expect(loggerSpyDebug).not.toHaveBeenCalled;
			expect(loggerSpyInfo).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(200);
			expect(res.body).toMatchObject({ token: expect.any(String) });
		});

		test("Refresh token with missing refresh token", async () => {
			const res = await sendPostRequest("/v1/auth/refresh", {}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Refresh token request failed. Missing token.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(400);
			expect(res.body).toMatchObject({ message: "Missing token." });
		});

		test("Refresh token with expired refresh token", async () => {
			const res = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMnJzazJ6dzAwMDRudXJ5NTFzbHJndTAiLCJpYXQiOjE3MzAzNDgzNDcsImV4cCI6MTczMDM0ODQwN30.E4tP64dgKdpXl4uLhbz1sgTq2viP1FISMVBjJJBdx1t4ndMQMAa6TvdduIL8Jd0EUtSz351XRdozrXHn2BSesw"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(expect.stringContaining(`Refresh token request failed. Token expired. \nExpiredAt: `));
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			// Check to see if the date in the log call is valid
			const logCall = loggerSpyInfo.mock.calls.find(call => (call[0] as string).includes('ExpiredAt: '));
			if (logCall) {
				const dateString = (logCall[0] as string).split('ExpiredAt: ')[1];
				const date = new Date(dateString);
				expect(date.toString()).not.toBe('Invalid Date');
			}

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired token." });
		});

		test("Refresh token with malformed refresh token", async () => {
			const res = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: "malformedToken"
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Refresh token request failed. Malformed token.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired token." });
		});

		test("Refresh token with invalid refresh token payload", async () => {

			const res1 = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: refreshTokenHasString
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Refresh token request failed. Invalid refresh token payload: "Hain, haulu"`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res1.statusCode).toBe(401);
			expect(res1.body).toMatchObject({ message: "Invalid or expired token." });

			loggerSpyInfo.mockClear();

			const res2 = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: refreshTokenNotWithId
			}, null);

			const expectedPayload = {
				username: "testUser",
				email: "test@example.com",
				iat: 1730316072
			};

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Refresh token request failed. Invalid refresh token payload: ${JSON.stringify(expectedPayload)}`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res2.statusCode).toBe(401);
			expect(res2.body).toMatchObject({ message: "Invalid or expired token." });

		});

		test("User in refresh token not found", async () => {

			const res = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: refreshTokenWithInvalidId
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith(`Refresh token request failed. User with ID cm2w9um5500000cmn01yk1odf not found.`);
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired token." });
		});


		test("Refresh token with invalid refresh token signature", async () => {

			const res = await sendPostRequest("/v1/auth/refresh", {
				refreshToken: refreshTokenWithInvalidSecret
			}, null);

			expect(loggerSpyInfo).toHaveBeenCalledWith("Refresh token request failed. Invalid token signature.");
			expect(loggerSpyDebug).not.toHaveBeenCalled;

			expect(res.statusCode).toBe(401);
			expect(res.body).toMatchObject({ message: "Invalid or expired token." });
		});
	});
	
});