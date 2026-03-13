export interface ServiceContainer {
  now(): Date;
}

export function createContainer(): ServiceContainer {
  return {
    now: () => new Date(),
  };
}

