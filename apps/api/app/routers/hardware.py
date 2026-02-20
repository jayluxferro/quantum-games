"""API routes for IBM Quantum hardware integration."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ..quantum.ibm_quantum import ibm_quantum_service
from ..core.security import require_user, require_role

router = APIRouter(prefix="/hardware", tags=["hardware"])


class CircuitSubmission(BaseModel):
    """Request body for submitting a circuit to hardware."""
    num_qubits: int
    gates: List[Dict[str, Any]]
    backend: Optional[str] = None
    shots: int = 1024


class BackendInfo(BaseModel):
    """Backend information response."""
    name: str
    num_qubits: int
    status: str
    pending_jobs: int
    operational: bool


class JobStatus(BaseModel):
    """Job status response."""
    job_id: str
    status: str
    backend: str
    creation_date: Optional[str] = None


@router.get("/status")
async def get_hardware_status():
    """Check if IBM Quantum hardware is available."""
    return {
        "available": ibm_quantum_service.is_available,
        "default_backend": ibm_quantum_service.backend_name,
    }


@router.post("/initialize")
async def initialize_hardware(user=Depends(require_role(["admin", "researcher"]))):
    """Initialize the IBM Quantum service (admin/researcher only)."""
    success = ibm_quantum_service.initialize()
    if success:
        return {"message": "IBM Quantum service initialized successfully"}
    raise HTTPException(status_code=500, detail="Failed to initialize IBM Quantum service")


@router.get("/backends", response_model=List[BackendInfo])
async def list_backends():
    """List available quantum backends."""
    if not ibm_quantum_service.is_available:
        # Try to initialize
        ibm_quantum_service.initialize()
    
    backends = ibm_quantum_service.list_backends()
    return backends


@router.get("/backends/{backend_name}")
async def get_backend_info(backend_name: str):
    """Get detailed information about a specific backend."""
    if not ibm_quantum_service.is_available:
        raise HTTPException(status_code=503, detail="IBM Quantum service not available")
    
    backend = ibm_quantum_service.get_backend(backend_name)
    if not backend:
        raise HTTPException(status_code=404, detail=f"Backend {backend_name} not found")
    
    status = backend.status()
    config = backend.configuration()
    
    return {
        "name": backend.name,
        "num_qubits": backend.num_qubits,
        "status": status.status_msg,
        "operational": status.operational,
        "pending_jobs": status.pending_jobs,
        "basis_gates": config.basis_gates,
        "max_shots": config.max_shots,
    }


@router.post("/run")
async def run_on_hardware(
    submission: CircuitSubmission,
    background_tasks: BackgroundTasks,
    user=Depends(require_user)
):
    """
    Submit a circuit to run on IBM Quantum hardware.
    
    Requires authentication. Returns job ID for tracking.
    """
    if not ibm_quantum_service.is_available:
        raise HTTPException(status_code=503, detail="IBM Quantum service not available")
    
    # Validate circuit
    if submission.num_qubits < 1 or submission.num_qubits > 127:
        raise HTTPException(status_code=400, detail="Invalid number of qubits")
    
    if submission.shots < 1 or submission.shots > 20000:
        raise HTTPException(status_code=400, detail="Shots must be between 1 and 20000")
    
    # Run circuit
    result = await ibm_quantum_service.run_circuit(
        circuit_data={
            "num_qubits": submission.num_qubits,
            "gates": submission.gates,
        },
        backend_name=submission.backend,
        shots=submission.shots
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Unknown error running circuit")
        )
    
    return result


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, user=Depends(require_user)):
    """Get the status of a submitted job."""
    if not ibm_quantum_service.is_available:
        raise HTTPException(status_code=503, detail="IBM Quantum service not available")
    
    status = ibm_quantum_service.get_job_status(job_id)
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    
    return status


@router.get("/queue/{backend_name}")
async def get_queue_estimate(backend_name: str):
    """Get estimated queue time for a backend."""
    if not ibm_quantum_service.is_available:
        raise HTTPException(status_code=503, detail="IBM Quantum service not available")
    
    estimate = ibm_quantum_service.estimate_queue_time(backend_name)
    if "error" in estimate:
        raise HTTPException(status_code=404, detail=estimate["error"])
    
    return estimate


@router.get("/simulators")
async def list_simulators():
    """List available simulators (always available, no IBM account needed)."""
    return [
        {
            "name": "aer_simulator",
            "description": "Qiskit Aer simulator (local)",
            "max_qubits": 32,
            "type": "statevector",
        },
        {
            "name": "qasm_simulator",
            "description": "QASM simulator (local)",
            "max_qubits": 32,
            "type": "sampling",
        },
    ]
