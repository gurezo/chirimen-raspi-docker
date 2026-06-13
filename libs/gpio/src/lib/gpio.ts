export type GpioDirection = 'in' | 'out';
export type GpioValue = 0 | 1;

export interface GpioPortDescriptor {
  portNumber: number;
  direction?: GpioDirection;
}
