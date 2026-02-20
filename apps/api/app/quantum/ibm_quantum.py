"""IBM Quantum integration for running circuits on real quantum hardware."""

import os
import json
from typing import Optional, Dict, Any, List
from qiskit import QuantumCircuit, transpile
from qiskit.circuit import Parameter
from qiskit_ibm_runtime import QiskitRuntimeService, Session, Sampler, Estimator


class IBMQuantumService:
    """Service for interacting with IBM Quantum hardware."""
    
    def __init__(self):
        self.service: Optional[QiskitRuntimeService] = None
        self.backend_name = os.getenv("IBM_QUANTUM_BACKEND", "ibmq_qasm_simulator")
        self._initialized = False
    
    def initialize(self) -> bool:
        """Initialize the IBM Quantum service with API token."""
        token = os.getenv("IBM_QUANTUM_TOKEN")
        if not token:
            print("IBM Quantum token not configured")
            return False
        
        try:
            # Save account if not already saved
            QiskitRuntimeService.save_account(
                channel="ibm_quantum",
                token=token,
                overwrite=True
            )
            
            self.service = QiskitRuntimeService(channel="ibm_quantum")
            self._initialized = True
            print(f"IBM Quantum service initialized")
            return True
        except Exception as e:
            print(f"Failed to initialize IBM Quantum service: {e}")
            return False
    
    @property
    def is_available(self) -> bool:
        """Check if the IBM Quantum service is available."""
        return self._initialized and self.service is not None
    
    def list_backends(self) -> List[Dict[str, Any]]:
        """List available quantum backends."""
        if not self.is_available:
            return []
        
        try:
            backends = self.service.backends()
            return [
                {
                    "name": b.name,
                    "num_qubits": b.num_qubits,
                    "status": b.status().status_msg,
                    "pending_jobs": b.status().pending_jobs,
                    "operational": b.status().operational,
                }
                for b in backends
            ]
        except Exception as e:
            print(f"Error listing backends: {e}")
            return []
    
    def get_backend(self, name: Optional[str] = None):
        """Get a specific backend by name."""
        if not self.is_available:
            return None
        
        backend_name = name or self.backend_name
        try:
            return self.service.backend(backend_name)
        except Exception as e:
            print(f"Error getting backend {backend_name}: {e}")
            return None
    
    async def run_circuit(
        self,
        circuit_data: Dict[str, Any],
        backend_name: Optional[str] = None,
        shots: int = 1024
    ) -> Dict[str, Any]:
        """
        Run a quantum circuit on IBM Quantum hardware.
        
        Args:
            circuit_data: Circuit definition with gates and qubits
            backend_name: Optional backend name override
            shots: Number of measurement shots
            
        Returns:
            Results including counts and metadata
        """
        if not self.is_available:
            return {
                "error": "IBM Quantum service not available",
                "success": False
            }
        
        try:
            # Build circuit from data
            num_qubits = circuit_data.get("num_qubits", 2)
            qc = QuantumCircuit(num_qubits)
            
            # Apply gates
            for gate in circuit_data.get("gates", []):
                gate_type = gate["type"].upper()
                qubits = gate.get("qubits", [0])
                params = gate.get("params", [])
                
                if gate_type == "H":
                    qc.h(qubits[0])
                elif gate_type == "X":
                    qc.x(qubits[0])
                elif gate_type == "Y":
                    qc.y(qubits[0])
                elif gate_type == "Z":
                    qc.z(qubits[0])
                elif gate_type == "S":
                    qc.s(qubits[0])
                elif gate_type == "T":
                    qc.t(qubits[0])
                elif gate_type == "RX" and params:
                    qc.rx(params[0], qubits[0])
                elif gate_type == "RY" and params:
                    qc.ry(params[0], qubits[0])
                elif gate_type == "RZ" and params:
                    qc.rz(params[0], qubits[0])
                elif gate_type == "CNOT" and len(qubits) >= 2:
                    qc.cx(qubits[0], qubits[1])
                elif gate_type == "CZ" and len(qubits) >= 2:
                    qc.cz(qubits[0], qubits[1])
                elif gate_type == "SWAP" and len(qubits) >= 2:
                    qc.swap(qubits[0], qubits[1])
            
            # Add measurements
            qc.measure_all()
            
            # Get backend
            backend = self.get_backend(backend_name)
            if not backend:
                return {
                    "error": f"Backend {backend_name or self.backend_name} not available",
                    "success": False
                }
            
            # Transpile for the target backend
            transpiled = transpile(qc, backend)
            
            # Run with Sampler
            with Session(self.service, backend=backend) as session:
                sampler = Sampler(session=session)
                job = sampler.run([transpiled], shots=shots)
                result = job.result()
            
            # Process results
            counts = {}
            if hasattr(result, 'quasi_dists') and result.quasi_dists:
                # Convert quasi-probabilities to counts
                quasi_dist = result.quasi_dists[0]
                for bitstring, prob in quasi_dist.items():
                    # Format bitstring
                    formatted = format(bitstring, f'0{num_qubits}b')
                    counts[formatted] = int(prob * shots)
            
            return {
                "success": True,
                "counts": counts,
                "shots": shots,
                "backend": backend.name,
                "job_id": job.job_id(),
                "num_qubits": num_qubits,
                "depth": transpiled.depth(),
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "success": False
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get the status of a submitted job."""
        if not self.is_available:
            return {"error": "Service not available"}
        
        try:
            job = self.service.job(job_id)
            return {
                "job_id": job_id,
                "status": str(job.status()),
                "backend": job.backend().name,
                "creation_date": str(job.creation_date),
            }
        except Exception as e:
            return {"error": str(e)}
    
    def estimate_queue_time(self, backend_name: Optional[str] = None) -> Dict[str, Any]:
        """Estimate queue time for a backend."""
        backend = self.get_backend(backend_name)
        if not backend:
            return {"error": "Backend not available"}
        
        try:
            status = backend.status()
            return {
                "backend": backend.name,
                "pending_jobs": status.pending_jobs,
                "operational": status.operational,
                "status_msg": status.status_msg,
            }
        except Exception as e:
            return {"error": str(e)}


# Global instance
ibm_quantum_service = IBMQuantumService()
