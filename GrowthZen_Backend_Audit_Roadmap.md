# AI Agent Instructions

Before implementing any feature:

1. Analyse the existing project structure.
2. Analyse related modules.
3. Reuse existing utilities and patterns.
4. Do not introduce breaking changes.
5. Maintain backward compatibility.
6. If schema changes are required, update Prisma schema and generate migrations.
7. Ensure the entire project compiles successfully before considering the task complete.
8. Never return partial implementations.
9. Never skip validation, documentation, or error handling.
10. Always deliver production-ready code.


---

# Development Rules (Mandatory)

The following rules are **mandatory** for every feature, module, API, database migration, and code generated in this project.

## General Requirements

- Every implementation must be production-ready.
- Never generate placeholder code or TODO comments.
- Never leave incomplete logic.
- Never break existing functionality.
- Follow Clean Architecture and SOLID principles.
- Keep the project modular, scalable, and maintainable.
- Maintain consistent naming conventions across the project.

---

# TypeScript Standards

- The project must compile successfully using `npm run build`.
- There must be **ZERO TypeScript errors**.
- There must be **ZERO Prisma type errors**.
- There must be **ZERO ESLint errors** (where applicable).
- Avoid using `any` unless absolutely unavoidable.
- Use strict typing everywhere.
- Use interfaces and types consistently.
- All functions must have proper return types.

---

# Prisma Standards

- Use Prisma ORM best practices.
- Every schema change must include a migration.
- Use proper database relations instead of string references.
- Avoid duplicated data.
- Optimise indexes where necessary.
- Follow database normalisation principles.
- Ensure referential integrity.

---

# API Standards

Every API must include:

- Controller
- Service
- Repository (if applicable)
- Route
- Validation
- Interface
- Types
- Constants
- Swagger Documentation
- Error Handling

Support:

- Pagination
- Filtering
- Sorting
- Searching
- Consistent API Response
- Proper HTTP Status Codes

---

# Validation Standards

- Validate every request using Zod.
- Never trust client input.
- Validate:
  - Body
  - Params
  - Query
  - Headers (when necessary)

---

# Error Handling

Every endpoint must handle:

- Validation Errors
- Database Errors
- Authentication Errors
- Authorization Errors
- Unknown Errors

Use the project's central error handler only.

---

# Security Standards

Every new feature must follow these rules:

- Authentication required where applicable.
- Role-based authorisation.
- Input sanitisation.
- Rate limiting compatibility.
- Helmet compatibility.
- Secure JWT handling.
- No sensitive information in responses.
- No hardcoded secrets.
- Environment variables only.

---

# Database Rules

- Never store relational data as plain strings.
- Use foreign keys.
- Use soft delete where appropriate.
- Add timestamps.
- Use indexes where necessary.
- Prevent duplicate records.
- Design for scalability.

---

# Code Quality

Every implementation must:

- Follow existing folder structure.
- Follow existing coding style.
- Avoid duplicated logic.
- Keep functions small and readable.
- Use reusable utilities.
- Remove dead code.
- Write self-explanatory code.

---

# Performance

Optimise every feature for:

- Large datasets
- High traffic
- Low database queries
- Efficient Prisma queries
- Proper indexing
- Scalable architecture

Avoid N+1 query problems.

---

# Documentation

Every new module must include:

- API documentation
- Validation rules
- Database changes
- Route list
- Usage examples
- Environment variable changes (if any)

---

# Testing Checklist

Before considering any feature complete, ensure:

- Project builds successfully.
- No TypeScript errors.
- No Prisma errors.
- No runtime errors.
- No circular dependencies.
- Existing APIs remain functional.
- New APIs are fully tested.

---

# Completion Criteria

A feature is considered complete only when:

- ✅ Production-ready
- ✅ Fully typed
- ✅ Fully validated
- ✅ Secure
- ✅ Scalable
- ✅ Documented
- ✅ No TypeScript errors
- ✅ No Prisma errors
- ✅ No build errors
- ✅ No broken existing features
- ✅ Clean Architecture compliant
- ✅ SOLID principles followed
- ✅ Ready for deployment

----

# AI Development Instructions

When implementing any feature:

- First analyse the existing project architecture.
- Reuse existing utilities, middleware, helpers, and shared modules.
- Do not duplicate code.
- Keep backward compatibility.
- Update Swagger documentation.
- Update Prisma schema and generate migrations if required.
- Update validation schemas.
- Ensure all imports are correct.
- Ensure the project builds successfully after every change.
- Never leave the project in a broken state.

The final output for every task must be production-ready, enterprise-grade, scalable, secure, fully typed, and maintainable.