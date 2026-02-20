# Quantum Games Platform

An open-source educational platform that teaches quantum computing through interactive games, designed for learners from elementary school to postgraduate researchers.

## Features

- **Multi-Level Education**: Games tailored for ages 6 to adult researchers
- **Real Quantum Simulation**: Powered by Qiskit and quantum-circuit
- **Multiplayer Support**: Real-time and turn-based competitive modes
- **LMS Integration**: LTI 1.3 support for Moodle, Canvas, and more
- **Self-Hosted**: Docker-based deployment

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd quantum-games

# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis keycloak

# Start development servers
pnpm dev
```

Visit http://localhost:5173 to play!

## Architecture

```
quantum-games/
├── apps/
│   ├── web/           # React + Phaser.js frontend
│   ├── api/           # FastAPI + Qiskit backend
│   ├── multiplayer/   # Colyseus game server
│   └── lti/           # LTI 1.3 service
├── packages/
│   ├── quantum-sim/   # Browser quantum simulator
│   └── types/         # Shared TypeScript types
└── config/            # Docker and service configs
```

## Games

| Game | Level | Concepts |
|------|-------|----------|
| Quantum Pet | Basic (6-10) | Superposition |
| Qubit Quest | Junior (11-14) | Gates, Qubits |
| Circuit Architect | Senior (15-18) | Circuits |
| Quantum Spy | Senior (15-18) | QKD, BB84 |
| Grover's Maze | Undergraduate | Algorithms |
| Protocol Lab | Postgraduate | Research |

## Technology Stack

- **Frontend**: React 18, Phaser.js 3, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Qiskit, PostgreSQL, Redis
- **Multiplayer**: Colyseus
- **Auth**: Keycloak (OAuth2/OIDC)
- **LMS**: LTI 1.3

## Documentation

- [Setup Guide](docs/setup.md)
- [LMS Integration](docs/lms-integration.md)
- [Game Development](docs/game-development.md)

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
