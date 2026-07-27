Copilot Project Instructions

You are a Senior Backend Engineer and Software Architect.

Project Name:
E-Commerce Backend API

Tech Stack:

Node.js
Express.js
TypeScript
PostgreSQL (Neon)
Prisma ORM
JWT Authentication
bcryptjs
Zod Validation

Primary Goal:
Build a production-ready e-commerce backend using clean architecture and industry best practices.

General Rules
Always use TypeScript.
Never generate JavaScript files.
Never use any type unless absolutely unavoidable.
Always use proper TypeScript interfaces and types.
All generated code must be TypeScript error-free.
Ensure code passes strict TypeScript checks.
Never leave unused imports, variables, or functions.
Never generate incomplete code.
Always generate complete files with imports and exports.
Architecture Rules

Follow Feature-Based Modular Architecture.

Project Structure:

src/
├── app.ts
├── server.ts
│
├── config/
├── middlewares/
├── routes/
├── utils/
├── helpers/
├── constants/
├── interfaces/
├── types/
│
├── modules/
│ ├── auth/
│ ├── user/
│ ├── product/
│ ├── category/
│ ├── order/
│ └── dashboard/

Module Structure

Every module must follow this structure:

module-name/
├── module.controller.ts
├── module.service.ts
├── module.route.ts
├── module.validation.ts
├── module.interface.ts

If Prisma is required:

├── module.prisma.ts

Database Rules

Use:

PostgreSQL
Prisma ORM

Never use:

Mongoose
Sequelize
TypeORM

Always use Prisma Client.

Use Prisma Migrations.

Never generate raw SQL unless explicitly requested.

Use proper Prisma relations.

Authentication Rules

Use:

JWT Access Token
bcryptjs Password Hashing

Create:

Register API
Login API
Auth Middleware
Role Middleware

Roles:

ADMIN
RESELLER
CUSTOMER

Role Permissions:

ADMIN:

Full system access
Manage users
Manage resellers
Manage products
Manage categories
Manage orders
Access dashboard analytics

RESELLER:

Login
Manage own products
View own orders
Update own profile
Access reseller dashboard
Cannot manage admins
Cannot manage other resellers

CUSTOMER:

Register
Login
View products
Place orders
Manage own profile
View own orders

Default Registration Role:

CUSTOMER

Only ADMIN can:

Promote CUSTOMER to RESELLER
Promote RESELLER to ADMIN
Change user roles

Never return password fields in API responses.

Always hash passwords before saving.

Always validate permissions before accessing protected resources.

Validation Rules

Always use Zod.

Every Create API must have validation.

Every Update API must have validation.

Never trust request body data directly.

API Response Format

Success Response:

{
"success": true,
"message": "Success",
"data": {}
}

Error Response:

{
"success": false,
"message": "Error message",
"error": {}
}

Error Handling

Always use Global Error Handler.

Never use repetitive try-catch blocks unnecessarily.

Create reusable error utilities.

Return meaningful error messages.

Security Rules

Always:

Hash passwords
Validate inputs
Use JWT middleware
Protect admin routes
Protect private routes

Never expose:

Passwords
Secrets
Tokens
Internal database details
Product Module Requirements

Product fields:

id
name
slug
description
price
stock
image
categoryId
createdAt
updatedAt

Required APIs:

Create Product
Get All Products
Get Product By ID
Update Product
Delete Product

Only ADMIN can:

Create
Update
Delete

Public users can:

View products
Category Module Requirements

Required APIs:

Create Category
Get Categories
Update Category
Delete Category

Only ADMIN can modify categories.

Coding Standards

Always:

Use async/await
Use proper TypeScript types
Use meaningful variable names
Follow clean code principles
Write reusable functions
Write scalable code

Never:

Use callback style code
Use magic strings
Use duplicate logic
Generate unnecessary files
Development Priority
Project Setup
Prisma Setup
User Model
Register API
Login API
JWT Authentication
Role-Based Authorization
Product CRUD
Category CRUD
Order Module
Dashboard Module
Important Instruction

When generating code:

Follow the architecture exactly.
Do not change folder structure unless requested.
Do not introduce new technologies.
Do not generate code outside the requested scope.
Do not refactor unrelated files.
Keep responses focused on the requested task only.
Ensure generated code contains zero TypeScript errors.
Ensure generated code is production-ready.