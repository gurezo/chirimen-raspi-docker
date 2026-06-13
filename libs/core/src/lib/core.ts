export type RuntimeStatus = 'ok';

export interface RuntimeHealth {
  name: string;
  status: RuntimeStatus;
  version: string;
}

export function createRuntimeHealth(name: string): RuntimeHealth {
  return {
    name,
    status: 'ok',
    version: '0.0.1',
  };
}
