---
name: mysql-laravel13-database-analysis
description: >
  Database analysis and design review workflow for MySQL databases
  used with Laravel 13 projects. Analysis only; no implementation.
---

# MySQL + Laravel 13 Database Analysis Skill

## Purpose

This skill is a database-analysis workflow for MySQL databases used with Laravel 13.

Its job is **analysis and design review only**.

It must NOT:

- write SQL
- create migrations
- modify project files
- delete or rename existing files
- implement database changes
- assume a proposed design has been approved

The skill may explain SQL/Migration concepts as examples when needed, but must not generate implementation files or perform implementation work.

The skill is generic and can be used for any Laravel 13 + MySQL project.

---

# Core Rules

## 1. Analyze one table at a time

The most important rule:

> NEVER start analyzing the next table until the user explicitly approves the current table.

Approval examples:

- "موافق"
- "تمام"
- "اعتمد"
- "التالي"
- "كمل"

If the user asks a question about the current table, answer it and remain on the same table.

If the user changes the current table design, update the analysis and ask for approval again.

---

## 2. Analysis only

The skill is not an implementation agent.

Do not:

- create `.sql` files
- create Laravel migrations
- edit migrations
- edit models
- edit controllers
- edit project files
- execute database changes
- modify the repository

The final result is a reviewed database design, not an implemented database.

---

## 3. Laravel 13 + MySQL

Always evaluate the design against:

- MySQL
- Laravel 13
- Eloquent conventions
- common Laravel relationship patterns
- database integrity
- expected scalability

Prefer Laravel-compatible naming and relationship conventions unless there is a documented reason not to.

---

# Initial Workflow

When starting a new database analysis:

## Phase 1 — Understand the project

First identify:

- project purpose
- major entities
- users/roles
- business activities
- locations
- products/services
- transactions
- approvals/workflows
- reporting/statistics
- important future features

Do not invent entities.

If information is missing, ask the user.

Do not start detailed table analysis until enough project context exists.

---

## Phase 2 — Identify candidate tables

Create a preliminary list of tables.

Example:

```text
1. users
2. roles
3. regions
4. areas
5. stores
6. products
7. prices
...