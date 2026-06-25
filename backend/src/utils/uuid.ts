import { validate as uuidValidate } from 'uuid';

export function isValidUuid(value: string): boolean {
  return uuidValidate(value);
}
