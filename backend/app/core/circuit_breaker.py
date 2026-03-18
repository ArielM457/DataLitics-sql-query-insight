"""Circuit Breaker — Protects DAB REST API calls from cascading failures.

Uses pybreaker to implement the Circuit Breaker pattern for the
Data API Builder (DAB) service. When DAB becomes unavailable, the
breaker opens and fails fast instead of waiting for timeout.
"""

import pybreaker

# Circuit breaker instance for DAB REST API calls
# - fail_max: number of failures before opening the circuit
# - reset_timeout: seconds before attempting to close the circuit again
dab_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="DAB Circuit Breaker",
)


def handle_circuit_breaker_error() -> dict:
    """Return a clear error response when the circuit breaker is open.

    Returns:
        dict: Error response indicating DAB service is unavailable.
    """
    return {
        "error": "DAB service is currently unavailable. "
        "The circuit breaker is open after multiple consecutive failures. "
        "Please try again later.",
        "circuit_state": "open",
    }
