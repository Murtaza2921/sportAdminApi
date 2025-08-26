# Cricket Surge Motion Server

Backend server for the Cricket Surge Motion application.

## Setup

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## Environment Variables

- `PORT` - Port to run the server on (default: 4000)

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/upload` - Upload a file
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category
- `DELETE /api/categories/:id` - Delete a category
- `GET /api/flash` - Get flash sale settings
- `PUT /api/flash` - Update flash sale settings
- `GET /api/products` - Get all products
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product
- `GET /api/events` - Get all events
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create a new sale
- `PUT /api/sales/:id` - Update a sale
- `DELETE /api/sales/:id` - Delete a sale
- `POST /api/auth/signup` - Sign up a new user
- `POST /api/auth/login` - Log in a user
- `GET /api/auth/me` - Get current user info

## Deployment

This server is designed to be deployed on Railway. Follow these steps:

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Select the server directory as the source directory
4. Railway will automatically detect the configuration from railway.toml
5. Set the following environment variables in Railway:
   - `NODE_ENV`: `production`
   - `CORS_ORIGINS`: Your frontend URLs (comma-separated)

Railway will automatically assign a PORT and provide you with a deployment URL. 