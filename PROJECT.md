# Subscription Management Project

This project helps you manage your subscriptions.

## Backend

The backend is a Node.js server using Express and SQLite.

### Authentication

Authentication is handled via an API key, which is configured using an environment variable.

1.  **Create a `.env` file**: In the **root directory** of the project, create a file named `.env`.

2.  **Set the API Key**: Add the following line to your `.env` file:
    ```
    API_KEY=your_secret_api_key_goes_here
    PORT=3001
    NODE_ENV=development
    ```
    Replace `your_secret_api_key_goes_here` with a strong, randomly generated key. You can create one by running this command in your terminal:
    ```bash
    node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
    ```

3.  **Use the API Key**: When making requests to protected endpoints, you must include the key in the `X-API-KEY` header.

The server will load this key automatically when it starts from the root `.env` file. If the `API_KEY` is not set in the environment, the server will return an error and will not be accessible.

**Note**: This project now uses unified configuration management with a single `.env` file in the root directory for both development and production environments.

#### Initial API Key

To set up your initial API key, generate a secure random key and add it to your `.env` file:

1.  Generate a secure API key:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

2.  Add the generated key to your root `.env` file:
    ```bash
    API_KEY=your_generated_key_here
    PORT=3001
    NODE_ENV=development
    ```

The server will automatically use this key when it starts. 

**Database Initialization**: The database will be automatically created and initialized on first startup if it doesn't exist. You can also manually initialize it using:

```bash
# Development environment
cd server && npm run db:init

# Docker environment  
docker run --rm -v subscription-data:/app/server/db --env-file .env subscription-manager:latest node server/db/init.js
```

#### Changing the API Key

You can change your API key by sending a `PUT` request to the `/api/settings` endpoint.

-   **URL**: `/api/settings`
-   **Method**: `PUT`
-   **Headers**:
    -   `Content-Type`: `application/json`
    -   `X-API-KEY`: `YOUR_CURRENT_API_KEY`
-   **Body**:
    ```json
    {
      "api_key": "YOUR_NEW_API_KEY"
    }
    ```

**Note**: The `POST /api/settings/reset` endpoint is not recommended for use, as it will reset the API key to an unusable state. If you need to reset the key, it's better to re-run the `db:init` script (which will reset all data). 