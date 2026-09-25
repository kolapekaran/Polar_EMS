# POLAR EMS

## AI Driven Smart Energy Management System for Polar Research Stations

POLAR EMS is a smart energy management system built for remote polar research stations.

The project focuses on Maitri Research Station in Antarctica and is designed to help operators understand the current energy situation, predict what may happen next, test different situations, and make better energy decisions.

The main idea behind POLAR EMS is simple:

Observe what is happening, understand the current situation, predict future conditions, simulate possible problems, optimize the available resources, and protect critical operations.

## What POLAR EMS Does

POLAR EMS brings different parts of station energy management into one system.

It provides:

1. Digital Twin

A digital representation of the research station where important energy assets and their operating conditions can be viewed and monitored.

2. Forecasting and AI

The system can work with energy demand, renewable energy, weather information, and forecasting models to understand future conditions.

3. Energy Management

The system tracks energy generation and consumption, renewable energy usage, battery operation, diesel generation, fuel usage, and energy reserves.

4. Optimization and Advisory

The system evaluates different energy strategies and provides operational recommendations based on factors such as demand, available renewable energy, battery state, fuel, and future conditions.

5. Assets and Loads

Station assets and loads can be monitored and analyzed, including their current operating state and importance to station operations.

6. Simulation

Different operating conditions and failure scenarios can be simulated to understand how the station may respond.

7. Resilience

The system helps analyze possible disruptions, energy reserves, critical operations, and possible responses during abnormal conditions.

8. Analytics

Energy, fuel, forecasting, and operational information can be analyzed through the analytics interface.

## Application

The application is organized into seven main sections:

1. Command Center
2. Optimization and Advisory
3. Energy
4. Assets and Loads
5. Simulator
6. Resilience
7. Analytics

The frontend is designed as an operational interface rather than a simple dashboard. The goal is to give the operator a clear view of what is happening and what could happen next.

## How the System Works

POLAR EMS follows this overall flow:

```text
Data Sources
     |
     v
Data Ingestion
     |
     v
Validation and Normalization
     |
     v
Digital Twin State
     |
     +-------------------+
     |         |         |
     v         v         v
 Forecast   Simulation  Analytics
     |         |         |
     +---------+---------+
               |
               v
          Optimization
               |
               v
        Decision Support
               |
               v
            Frontend
```

The backend handles the main energy models, forecasting, simulation, optimization, resilience calculations, and other system logic.

The frontend is responsible for presenting this information through an interactive interface.

## Technology Used

Backend

Python
FastAPI
Machine Learning
Forecasting
Simulation
Optimization

Frontend

React
TypeScript
Vite
Tailwind CSS
Recharts
Lucide React
Motion

## Project Structure

```text
POLAR_EMS_CLEAN_STRUCTURE_FINAL
|
|-- README.md
|
|-- backend
|   |-- app
|   |   |-- digital_twin
|   |   |-- models
|   |   |-- ml
|   |   |-- optimization
|   |   |-- simulation
|   |   |-- resilience
|   |   `-- ...
|   |
|   |-- tests
|   |-- requirements.txt
|   `-- ...
|
`-- frontend
    |-- src
    |   |-- integration
    |   |-- tabs
    |   |-- components
    |   `-- ...
    |
    |-- public
    |-- package.json
    `-- ...
```

## Running the Project

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd POLAR_EMS_CLEAN_STRUCTURE_FINAL
```

Backend setup:

```bash
cd backend
python -m venv .venv
```

On Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend using the project's configured entry point.

Frontend setup:

Open another terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The development server will display the local URL in the terminal.

## Testing

Frontend build:

```bash
cd frontend
npm run build
```

Frontend linting:

```bash
npm run lint
```

Backend tests:

```bash
cd backend
pytest
```

## Data Information

POLAR EMS keeps track of where different values come from.

Depending on the situation, information can be identified as live, cached, estimated, forecast, machine learning based, offline, engineering model output, simulation output, or reference data.

This is important because simulated or estimated information should not be confused with actual live station telemetry.

## Security

API keys, passwords, private credentials, and secret environment files should never be committed to the repository.

The repository should also exclude unnecessary files such as virtual environments, node modules, build outputs, caches, and other generated files.

## Project Scope

The current project focuses on a single research station:

Maitri Research Station
Antarctica

The main focus is energy management, forecasting, optimization, simulation, resilience, and operational decision support.

## Future Work

Some areas that can be improved in the future include better station specific forecasting, additional real time data sources, improved optimization methods, more detailed failure scenarios, predictive maintenance, hardware integration, and validation with larger real world datasets.

## Disclaimer

POLAR EMS is a research and development project intended for demonstration and decision support.

Any real world deployment would require validation with approved engineering procedures, reliable station telemetry, safety requirements, and qualified human supervision.
