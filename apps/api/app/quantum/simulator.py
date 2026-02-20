"""Quantum circuit simulator using Qiskit"""
from typing import Dict, List, Any, Optional
import numpy as np

try:
    from qiskit import QuantumCircuit
    from qiskit_aer import AerSimulator
    from qiskit.quantum_info import Statevector
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False


class QuantumSimulator:
    """Quantum circuit simulator wrapper"""
    
    def __init__(self):
        if QISKIT_AVAILABLE:
            self.simulator = AerSimulator()
        else:
            self.simulator = None
    
    def run_circuit(
        self,
        num_qubits: int,
        operations: List[Dict[str, Any]],
        shots: int = 1024,
        include_statevector: bool = False,
    ) -> Dict[str, Any]:
        """
        Run a quantum circuit and return measurement results.
        
        Args:
            num_qubits: Number of qubits in the circuit
            operations: List of gate operations
            shots: Number of measurement shots
            include_statevector: Whether to include statevector in result
            
        Returns:
            Dictionary with counts and probabilities
        """
        if not QISKIT_AVAILABLE:
            return self._fallback_simulation(num_qubits, operations, shots)
        
        qc = QuantumCircuit(num_qubits, num_qubits)
        
        for op in operations:
            self._apply_gate(qc, op)
        
        qc.measure(range(num_qubits), range(num_qubits))
        
        job = self.simulator.run(qc, shots=shots)
        result = job.result()
        counts = result.get_counts()
        
        total = sum(counts.values())
        probabilities = {k: v / total for k, v in counts.items()}
        
        response = {
            "counts": counts,
            "probabilities": probabilities,
        }
        
        if include_statevector:
            qc_sv = QuantumCircuit(num_qubits)
            for op in operations:
                self._apply_gate(qc_sv, op)
            sv = Statevector(qc_sv)
            response["statevector"] = sv.data.tolist()
        
        return response
    
    def verify_circuit(
        self,
        num_qubits: int,
        operations: List[Dict[str, Any]],
        target_state: Dict[str, float],
        tolerance: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Verify if a circuit produces the target probability distribution.
        
        Args:
            num_qubits: Number of qubits
            operations: List of gate operations
            target_state: Target probability distribution
            tolerance: Allowed deviation from target
            
        Returns:
            Dictionary with verification result and score
        """
        result = self.run_circuit(num_qubits, operations, shots=4096)
        actual_probs = result["probabilities"]
        
        all_states = set(target_state.keys()) | set(actual_probs.keys())
        
        total_diff = 0.0
        for state in all_states:
            target_prob = target_state.get(state, 0.0)
            actual_prob = actual_probs.get(state, 0.0)
            total_diff += abs(target_prob - actual_prob)
        
        avg_diff = total_diff / len(all_states) if all_states else 0
        matches = avg_diff <= tolerance
        
        score = max(0.0, 1.0 - avg_diff) * 100
        
        return {
            "success": True,
            "matches": matches,
            "actual_probabilities": actual_probs,
            "target_probabilities": target_state,
            "score": round(score, 2),
        }
    
    def _apply_gate(self, qc: "QuantumCircuit", op: Dict[str, Any]) -> None:
        """Apply a gate operation to the circuit"""
        gate = op["gate"].upper()
        qubits = op["qubits"]
        params = op.get("params", [])
        
        if gate == "I":
            qc.id(qubits[0])
        elif gate == "X":
            qc.x(qubits[0])
        elif gate == "Y":
            qc.y(qubits[0])
        elif gate == "Z":
            qc.z(qubits[0])
        elif gate == "H":
            qc.h(qubits[0])
        elif gate == "S":
            qc.s(qubits[0])
        elif gate == "T":
            qc.t(qubits[0])
        elif gate == "RX":
            qc.rx(params[0], qubits[0])
        elif gate == "RY":
            qc.ry(params[0], qubits[0])
        elif gate == "RZ":
            qc.rz(params[0], qubits[0])
        elif gate in ("CNOT", "CX"):
            qc.cx(qubits[0], qubits[1])
        elif gate == "CZ":
            qc.cz(qubits[0], qubits[1])
        elif gate == "SWAP":
            qc.swap(qubits[0], qubits[1])
        elif gate == "CCX":
            qc.ccx(qubits[0], qubits[1], qubits[2])
        elif gate == "CSWAP":
            qc.cswap(qubits[0], qubits[1], qubits[2])
        else:
            raise ValueError(f"Unknown gate: {gate}")
    
    def _fallback_simulation(
        self,
        num_qubits: int,
        operations: List[Dict[str, Any]],
        shots: int,
    ) -> Dict[str, Any]:
        """
        Fallback simulation when Qiskit is not available.
        Uses simple numpy-based state vector simulation.
        """
        state = np.zeros(2**num_qubits, dtype=complex)
        state[0] = 1.0
        
        for op in operations:
            gate = op["gate"].upper()
            qubits = op["qubits"]
            params = op.get("params", [])
            
            if gate == "I":
                pass
            elif gate == "X":
                state = self._apply_single_gate(state, num_qubits, qubits[0], 
                    np.array([[0, 1], [1, 0]]))
            elif gate == "H":
                state = self._apply_single_gate(state, num_qubits, qubits[0],
                    np.array([[1, 1], [1, -1]]) / np.sqrt(2))
            elif gate == "Z":
                state = self._apply_single_gate(state, num_qubits, qubits[0],
                    np.array([[1, 0], [0, -1]]))
            elif gate in ("CNOT", "CX"):
                state = self._apply_cnot(state, num_qubits, qubits[0], qubits[1])
        
        probs = np.abs(state)**2
        
        counts = {}
        for _ in range(shots):
            outcome = np.random.choice(len(probs), p=probs)
            bitstring = format(outcome, f'0{num_qubits}b')
            counts[bitstring] = counts.get(bitstring, 0) + 1
        
        probabilities = {k: v / shots for k, v in counts.items()}
        
        return {
            "counts": counts,
            "probabilities": probabilities,
        }
    
    def _apply_single_gate(
        self,
        state: np.ndarray,
        num_qubits: int,
        target: int,
        gate_matrix: np.ndarray,
    ) -> np.ndarray:
        """Apply a single-qubit gate to the state vector"""
        n = 2**num_qubits
        new_state = np.zeros(n, dtype=complex)
        
        for i in range(n):
            bit = (i >> target) & 1
            i0 = i & ~(1 << target)
            i1 = i | (1 << target)
            
            if bit == 0:
                new_state[i0] += gate_matrix[0, 0] * state[i0] + gate_matrix[0, 1] * state[i1]
                new_state[i1] += gate_matrix[1, 0] * state[i0] + gate_matrix[1, 1] * state[i1]
        
        return new_state
    
    def _apply_cnot(
        self,
        state: np.ndarray,
        num_qubits: int,
        control: int,
        target: int,
    ) -> np.ndarray:
        """Apply CNOT gate to the state vector"""
        n = 2**num_qubits
        new_state = state.copy()
        
        for i in range(n):
            control_bit = (i >> control) & 1
            if control_bit == 1:
                j = i ^ (1 << target)
                new_state[i], new_state[j] = state[j], state[i]
        
        return new_state
