declare module '@google-analytics/data' {
  export class BetaAnalyticsDataClient {
    constructor(options?: any);
    batchRunReports(request: any): Promise<[any]>;
  }
}

declare module 'next/server' {
  export class NextRequest {
    nextUrl: URL;
  }
  export class NextResponse {
    static json(body: any, init?: any): any;
  }
}

declare module 'react' {
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useState<T>(initialState: T): [T, (value: T | ((prevState: T) => T)) => void];
}

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}


declare const process: {
  env: Record<string, string | undefined>;
};

declare namespace React {
  interface Attributes {
    key?: string | number;
  }
}
