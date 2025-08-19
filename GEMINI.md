
# GEMINI Project Analysis: DLFlow

## Project Overview

This project, **DLFlow**, is a modern, intelligent web-based platform for data processing. It is designed for data analysts and engineers to build complex data processing pipelines through an intuitive visual interface, without needing to write extensive code. The platform supports CSV and Parquet file formats, features intelligent time data recognition, multivariate analysis, and real-time visualization.

**Key Technologies:**

*   **Frontend:** React 18, TypeScript, Ant Design, Vite, React Flow, ECharts, Tailwind CSS
*   **Backend:** FastAPI, Python 3.11+, Polars, SQLAlchemy, APScheduler, Uvicorn
*   **Database:** SQLite
*   **Package Management:** npm (frontend), uv (backend)
*   **Task Runner:** just

**Architecture:**

The project follows a decoupled architecture with a React single-page application (SPA) for the frontend and a FastAPI-based RESTful API for the backend. It uses SQLite as a lightweight, embedded database, and Polars for high-performance data processing. Task scheduling is handled by APScheduler, which simplifies the architecture by avoiding the need for a separate Redis or Celery setup.

## Building and Running

The project provides a `justfile` that simplifies common development tasks.

**Prerequisites:**

*   Node.js 18.0+
*   Python 3.11+
*   uv (Python package manager)
*   just (command runner)

**Installation:**

To install all project dependencies, run the following command from the project root:

```bash
just install
```

This will install both the frontend (npm) and backend (uv) dependencies.

**Running the Application:**

To start both the frontend and backend development servers simultaneously, use the following command:

```bash
just dev
```

This will:

*   Start the frontend development server on `http://localhost:5173`
*   Start the backend API server on `http://localhost:8000`
*   Provide access to the API documentation at `http://localhost:8000/docs`

**Other `just` Commands:**

*   `just frontend`: Start only the frontend server.
*   `just backend`: Start only the backend server.
*   `just clean`: Clean up project cache and temporary files.
*   `just reset`: Reset the project by cleaning and reinstalling dependencies.
*   `just status`: Display the current status of the project.
*   `just help`: Show detailed help information.

## Development Conventions

**Frontend:**

*   Uses TypeScript for type-safe development.
*   Follows ESLint for code style.
*   Component names use `PascalCase`.
*   File names use `kebab-case`.

**Backend:**

*   Follows PEP 8 Python code style.
*   Uses Black for code formatting.
*   Uses Ruff for code linting.
*   Uses MyPy for type checking.
*   Requires comprehensive docstrings for new code.

**Testing:**

*   New features should include corresponding test cases.
*   All tests must pass before merging code.
*   The project aims for a test coverage of over 80%.
