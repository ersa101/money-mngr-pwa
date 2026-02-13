// Mock React types for development without node_modules

// Basic type definitions
export type FC<P = {}> = (props: P) => any
export type ReactNode = any
export type ReactElement = any

// Event types
export namespace React {
  export type ChangeEvent<T = Element> = {
    target: T & { value: string; checked?: boolean; name?: string }
    preventDefault: () => void
  }
  export type FormEvent<T = HTMLFormElement> = {
    target: T
    preventDefault: () => void
  }
  export type ClipboardEvent<T = Element> = {
    clipboardData: { getData: (type: string) => string }
    preventDefault: () => void
  }
  export type ComponentType<P = {}> = ((props: P) => ReactElement) | string
}

// Hooks with proper typing
export function useState<T>(initialValue: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  return [initialValue as any, () => {}]
}

export function useEffect(effect: () => void | (() => void), deps?: any[]): void {}

export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T {
  return callback
}

export function useMemo<T>(factory: () => T, deps: any[]): T {
  return factory()
}

export function useContext<T>(context: any): T {
  return {} as T
}

export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S
): [S, (action: A) => void] {
  return [initialState, () => {}]
}

export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue }
}

export const Fragment = 'Fragment'

export default {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useReducer,
  useRef,
  forwardRef: <T, P>(cb: (props: P, ref: any) => any) => cb,
  Fragment
}

// Minimal DOM attribute types used in the project
export type HTMLAttributes<T = any> = { [key: string]: any }
export type ButtonHTMLAttributes<T = any> = HTMLAttributes<T> & { type?: string }

// Provide a named forwardRef for files importing React.forwardRef
export function forwardRef<T, P>(render: (props: P, ref: any) => any): any {
  return render as any
}

