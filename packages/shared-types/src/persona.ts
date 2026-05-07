import { WithTimestamps } from './common';

/**
 * User Persona types
 */

export interface UserPersona extends WithTimestamps {
  id: string;
  userId: string;
  name: string;
  persona: string;
  isDefault: boolean;
}

export interface CreatePersonaInput {
  name: string;
  persona: string;
  isDefault?: boolean;
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> {
  id: string;
}

export interface SetDefaultPersonaInput {
  id: string;
}
