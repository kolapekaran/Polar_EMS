# Integrated AI/ML

The supplied teammate models are preserved under `artifacts/` and exposed through `inference/predictor.py`.

## Current integration
- Load forecast
- Solar forecast
- Wind forecast
- Anomaly detection
- Failure classification + probability
- Current Twin-state inference
- 1–168 hour forecast endpoint

The ML adapter does **not** mutate Digital Twin state and does not perform battery/diesel control. That boundary is intentional: physical state belongs to the Digital Twin; future EMS/optimization consumes ML predictions and then sends control requests to the Twin.

The original training scripts are retained under `training/` for traceability. The supplied `.pkl` files are used for inference.
