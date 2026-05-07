# @persona-chat/proto

Protocol Buffer definitions and ConnectRPC generated code for Persona Chat.

## Generating Code

```bash
pnpm generate
```

This uses buf CLI to generate TypeScript code from .proto files.

## Services

- **CharacterService**: CRUD for AI characters
- **PersonaService**: Manage user personas
- **ChatRoomService**: Manage chat sessions
- **LlmModelService**: Configure AI models

## Generated Code

Generated TypeScript code is located in `gen/ts/` and is committed to the repository for reproducible builds.
