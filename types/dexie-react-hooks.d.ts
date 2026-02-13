// Mock dexie-react-hooks types
export const useLiveQuery = <T,>(querier: () => Promise<T>, deps?: any[]): T | undefined => undefined
