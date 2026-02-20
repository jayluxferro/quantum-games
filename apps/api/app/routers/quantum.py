"""Quantum simulation endpoints"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.quantum.simulator import QuantumSimulator

router = APIRouter(prefix="/quantum", tags=["quantum"])
simulator = QuantumSimulator()


class GateOperation(BaseModel):
    gate: str
    qubits: List[int]
    params: Optional[List[float]] = None


class CircuitRequest(BaseModel):
    num_qubits: int
    operations: List[GateOperation]
    shots: int = 1024


class CircuitResponse(BaseModel):
    success: bool
    counts: Dict[str, int]
    probabilities: Dict[str, float]
    statevector: Optional[List[complex]] = None


class VerifyRequest(BaseModel):
    num_qubits: int
    operations: List[GateOperation]
    target_state: Dict[str, float]
    tolerance: float = 0.1


class VerifyResponse(BaseModel):
    success: bool
    matches: bool
    actual_probabilities: Dict[str, float]
    target_probabilities: Dict[str, float]
    score: float


@router.post("/simulate", response_model=CircuitResponse)
async def simulate_circuit(
    request: CircuitRequest,
    user: Optional[dict] = Depends(get_current_user),
):
    """Simulate a quantum circuit and return measurement results"""
    if request.num_qubits > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 20 qubits supported for simulation"
        )
    
    if request.shots > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10000 shots allowed"
        )
    
    try:
        result = simulator.run_circuit(
            num_qubits=request.num_qubits,
            operations=[op.model_dump() for op in request.operations],
            shots=request.shots,
        )
        return CircuitResponse(
            success=True,
            counts=result["counts"],
            probabilities=result["probabilities"],
            statevector=result.get("statevector"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Simulation error: {str(e)}"
        )


@router.post("/verify", response_model=VerifyResponse)
async def verify_circuit(
    request: VerifyRequest,
    user: Optional[dict] = Depends(get_current_user),
):
    """Verify if a circuit produces the target state"""
    try:
        result = simulator.verify_circuit(
            num_qubits=request.num_qubits,
            operations=[op.model_dump() for op in request.operations],
            target_state=request.target_state,
            tolerance=request.tolerance,
        )
        return VerifyResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification error: {str(e)}"
        )


@router.get("/gates")
async def list_available_gates():
    """List all available quantum gates"""
    return {
        "single_qubit": [
            {"name": "I", "description": "Identity gate"},
            {"name": "X", "description": "Pauli-X (NOT) gate"},
            {"name": "Y", "description": "Pauli-Y gate"},
            {"name": "Z", "description": "Pauli-Z gate"},
            {"name": "H", "description": "Hadamard gate"},
            {"name": "S", "description": "S (phase) gate"},
            {"name": "T", "description": "T gate"},
            {"name": "RX", "description": "Rotation around X-axis", "params": ["theta"]},
            {"name": "RY", "description": "Rotation around Y-axis", "params": ["theta"]},
            {"name": "RZ", "description": "Rotation around Z-axis", "params": ["theta"]},
        ],
        "two_qubit": [
            {"name": "CNOT", "description": "Controlled-NOT gate"},
            {"name": "CX", "description": "Controlled-X gate (alias for CNOT)"},
            {"name": "CZ", "description": "Controlled-Z gate"},
            {"name": "SWAP", "description": "SWAP gate"},
        ],
        "three_qubit": [
            {"name": "CCX", "description": "Toffoli (CCNOT) gate"},
            {"name": "CSWAP", "description": "Fredkin (controlled-SWAP) gate"},
        ],
        "measurement": [
            {"name": "M", "description": "Measurement in computational basis"},
        ],
    }


@router.get("/concepts/{concept}")
async def get_concept_info(concept: str):
    """Get educational information about a quantum concept"""
    concepts = {
        "superposition": {
            "name": "Superposition",
            "description": "A qubit can exist in multiple states simultaneously until measured.",
            "analogy": "Like a coin spinning in the air - it's neither heads nor tails until it lands.",
            "gates": ["H"],
            "examples": [
                {
                    "description": "Create superposition with Hadamard gate",
                    "circuit": {"num_qubits": 1, "operations": [{"gate": "H", "qubits": [0]}]},
                }
            ],
        },
        "entanglement": {
            "name": "Entanglement",
            "description": "Two or more qubits become correlated in a way that measuring one instantly affects the other.",
            "analogy": "Like a pair of magical dice that always show the same number, no matter how far apart.",
            "gates": ["H", "CNOT"],
            "examples": [
                {
                    "description": "Create Bell state (maximally entangled)",
                    "circuit": {
                        "num_qubits": 2,
                        "operations": [
                            {"gate": "H", "qubits": [0]},
                            {"gate": "CNOT", "qubits": [0, 1]},
                        ],
                    },
                }
            ],
        },
        "measurement": {
            "name": "Measurement",
            "description": "Observing a qubit collapses its superposition to a definite state (0 or 1).",
            "analogy": "Like opening a box to see if Schrödinger's cat is alive or dead.",
            "gates": ["M"],
            "examples": [],
        },
        "interference": {
            "name": "Quantum Interference",
            "description": "Probability amplitudes can add constructively or destructively.",
            "analogy": "Like waves in water - they can combine to make bigger waves or cancel each other out.",
            "gates": ["H"],
            "examples": [
                {
                    "description": "Double Hadamard returns to original state",
                    "circuit": {
                        "num_qubits": 1,
                        "operations": [
                            {"gate": "H", "qubits": [0]},
                            {"gate": "H", "qubits": [0]},
                        ],
                    },
                }
            ],
        },
    }
    
    if concept not in concepts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept '{concept}' not found"
        )
    
    return concepts[concept]
