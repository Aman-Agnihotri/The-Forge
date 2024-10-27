import request from 'supertest';
import app from '../../src/app';

describe("JWT Authentication Tests", () => {
  // User Registration Tests
  describe("User Registration", () => {
    test("Register with valid data", async () => {
      const res = await request(app)
        .post("/v1/auth/register")
        .send({ 
          username: `newuser${Date.now()}`,
          email: `newuser${Date.now()}@example.com`,
          password: `ValidPass${Date.now()}!`
        });

      expect(res.statusCode).toBe(201);
    });

    test("Register with invalid email format", async () => {
      const res = await request(app)
        .post("/v1/auth/register")
        .send({ 
          username: "invalidEmailUser",
          email: "notAnEmail",
          password: "ValidPass123!"
        });

      expect(res.statusCode).toBe(400);
    });

    test("Register with weak password", async () => {
      const res = await request(app)
        .post("/v1/auth/register")
        .send({ 
          username: "weakPassUser", 
          email: "user@example.com", 
          password: "12345" 
        });

      expect(res.statusCode).toBe(400);
    });

    test("Register with duplicate email", async () => {
      const res = await request(app)
        .post("/v1/auth/register")
        .send({ 
          username: "duplicateEmailUser", 
          email: "string@hotmail.com", // A test email that is already registered in the database
          password: "ValidPass123!" 
        });

      expect(res.statusCode).toBe(409); // Conflict
    });
  });

  // Login Tests
  describe("User Login", () => {
    test("Login with valid credentials", async () => {
      const res = await request(app)
        .post("/v1/auth/login")
        .send({ email: "string@hotmail.com", password: "string123" });
  
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
    });
  
    test("Login with invalid credentials", async () => {
      const res = await request(app)
        .post("/v1/auth/login")
        .send({ email: "invalidUser@nomail.com", password: "invalidPassword" });
  
      expect(res.statusCode).toBe(401);
    });
  });

  // JWT Token Validation
  describe("JWT Token Validation", () => {
    test("Expired token access", async () => {
      // Assuming token is generated with a short expiry time for testing
      const expiredToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtMjd5a2lvZjAwMDAxMDJscGdkNjl1cXoiLCJpYXQiOjE3MzAwMjgzMzUsImV4cCI6MTczMDAyODYzNX0.yOqTslRMBkkF4uVdFeHttCIGbTkhsdxKKHWVU5b-KI_U3ON-iLKpn4DNa97kGMPsUvUqNf-SJ6aj4sd21A6TPw";
  
      const res = await request(app)
        .get("/v1/api/")
        .set("Authorization", `Bearer ${expiredToken}`);
  
      expect(res.statusCode).toBe(401);
    });
  });
});