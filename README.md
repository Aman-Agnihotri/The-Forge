# The Forge

**The Forge** is a modular, scalable API suite built to serve as the foundation for various projects. Designed with flexibility and security in mind, The Forge provides essential features for managing authentication, users, and API performance.

While this project is a work in progress, its first release will lay the groundwork for more advanced functionality in future iterations.

## Features in the First Release ✨

### 1. **Authentication & Authorization**
- **JWT-Based Authentication**: Secure user authentication system using tokens.
- **OAuth 2.0 Support**: Seamless integration with popular third-party providers like Google and GitHub.

### 2. **User Management**
- Basic CRUD operations for user data.
- Role-Based Access Control (RBAC): Fine-tuned access control for users based on roles and permissions.

### 3. **Rate Limiting**
- Prevent API abuse by limiting the number of requests a user can make in a given timeframe.

### 4. **Error Handling & Logging**
- Centralized error handling and logging to monitor API performance and ensure smooth operation.

### 5. **API Documentation**
- Comprehensive and interactive API documentation to make integration seamless for developers.

## Future Developments 🔮

The Forge is just getting started! Future versions will include features such as:
- **Caching**: Redis-based caching to boost performance and reduce load on the database.
- **Webhooks & Background Jobs**: Asynchronous processing and event-driven notifications.
- **Notifications**: Email and SMS notifications for important events and updates.

Stay tuned as The Forge continues to evolve with more powerful tools and integrations!

## Tech Stack 🛠️

- **Backend**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL using Prisma ORM
- **Authentication**: JWT, OAuth 2.0 (Google, GitHub)
- **Logging**: Winston and Pino (It's a choice. Both are implemented in the suite)
- **API Documentation**: Swagger

## Installation & Setup ⚙️

To set up and run The Forge locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Aman-Agnihotri/the-forge.git
   cd the-forge

2. **Install dependencies**:
   ```bash
   npm install

3. **Set up environment variables**:
   - Create a `.env` file in the root directory and configure the necessary variables like JWT secret and OAuth credentials.

4. **Initialize the database**:
   - Set up the server of your choice by passing the relevant information in the `.env` file and run the database migrations using Prisma. You can use the `.env.example` as a starting point for your `.env` file.

5. **Run the development server**:
   ```bash
   npm run dev

## License 📄

The Forge is licensed under the **MIT License**
