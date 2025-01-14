import { Injectable, InjectionToken, Type, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PlainObject, ɵStateClass } from '@ngxs/store/internals';
import { StateOperator } from '@ngxs/store/operators';

import { mergeDeep } from './utils/utils';
import { DispatchOutsideZoneNgxsExecutionStrategy } from './execution/dispatch-outside-zone-ngxs-execution-strategy';
import { NgxsExecutionStrategy } from './execution/symbols';
import { SharedSelectorOptions } from './internal/internals';
import { StateToken } from './state-token/state-token';

const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;

// The injection token is used to resolve a list of states provided at
// the root level through either `NgxsModule.forRoot` or `provideStore`.
export const ROOT_STATE_TOKEN = new InjectionToken<Array<ɵStateClass>>(
  NG_DEV_MODE ? 'ROOT_STATE_TOKEN' : ''
);

// The injection token is used to resolve a list of states provided at
// the feature level through either `NgxsModule.forFeature` or `provideStates`.
// The Array<Array> is used to overload the resolved value of the token because
// it is a multi-provider token.
export const FEATURE_STATE_TOKEN = new InjectionToken<Array<Array<ɵStateClass>>>(
  NG_DEV_MODE ? 'FEATURE_STATE_TOKEN' : ''
);

// The injection token is used to resolve to custom NGXS plugins provided
// at the root level through either `{provide}` scheme or `withNgxsPlugin`.
export const NGXS_PLUGINS = new InjectionToken(NG_DEV_MODE ? 'NGXS_PLUGINS' : '');

// The injection token is used to resolve to options provided at the root
// level through either `NgxsModule.forRoot` or `provideStore`.
export const NGXS_OPTIONS = new InjectionToken<NgxsModuleOptions>(
  NG_DEV_MODE ? 'NGXS_OPTIONS' : ''
);

export type NgxsLifeCycle = Partial<NgxsOnChanges> &
  Partial<NgxsOnInit> &
  Partial<NgxsAfterBootstrap>;

export type NgxsPluginFn = (state: any, mutation: any, next: NgxsNextPluginFn) => any;

/**
 * The NGXS config settings.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => mergeDeep(new NgxsConfig(), inject(NGXS_OPTIONS))
})
export class NgxsConfig {
  /**
   * Run in development mode. This will add additional debugging features:
   * - Object.freeze on the state and actions to guarantee immutability
   * (default: false)
   *
   * Note: this property will be accounted only in development mode when using the Ivy compiler.
   * It makes sense to use it only during development to ensure there're no state mutations.
   * When building for production, the Object.freeze will be tree-shaken away.
   */
  developmentMode: boolean;
  compatibility: {
    /**
     * Support a strict Content Security Policy.
     * This will circumvent some optimisations that violate a strict CSP through the use of `new Function(...)`.
     * (default: false)
     */
    strictContentSecurityPolicy: boolean;
  };
  /**
   * Determines the execution context to perform async operations inside. An implementation can be
   * provided to override the default behaviour where the async operations are run
   * outside Angular's zone but all observable behaviours of NGXS are run back inside Angular's zone.
   * These observable behaviours are from:
   *   `@Select(...)`, `store.select(...)`, `actions.subscribe(...)` or `store.dispatch(...).subscribe(...)`
   * Every `zone.run` causes Angular to run change detection on the whole tree (`app.tick()`) so of your
   * application doesn't rely on zone.js running change detection then you can switch to the
   * `NoopNgxsExecutionStrategy` that doesn't interact with zones.
   * (default: null)
   */
  executionStrategy: Type<NgxsExecutionStrategy>;
  /**
   * Defining the default state before module initialization
   * This is convenient if we need to create a define our own set of states.
   * @deprecated will be removed after v4
   * (default: {})
   */
  defaultsState: PlainObject = {};
  /**
   * Defining shared selector options
   */
  selectorOptions: SharedSelectorOptions = {
    injectContainerState: true, // TODO: default is true in v3, will change in v4
    suppressErrors: true // TODO: default is true in v3, will change in v4
  };

  constructor() {
    this.compatibility = {
      strictContentSecurityPolicy: false
    };
    this.executionStrategy = DispatchOutsideZoneNgxsExecutionStrategy;
  }
}

export { StateOperator };

/**
 * State context provided to the actions in the state.
 */
export interface StateContext<T> {
  /**
   * Get the current state.
   */
  getState(): T;

  /**
   * Reset the state to a new value.
   */
  setState(val: T | StateOperator<T>): T;

  /**
   * Patch the existing state with the provided value.
   */
  patchState(val: Partial<T>): T;

  /**
   * Dispatch a new action and return the dispatched observable.
   */
  dispatch(actions: any | any[]): Observable<void>;
}

export type NgxsNextPluginFn = (state: any, mutation: any) => any;

/**
 * Plugin interface
 */
export interface NgxsPlugin {
  /**
   * Handle the state/action before its submitted to the state handlers.
   */
  handle(state: any, action: any, next: NgxsNextPluginFn): any;
}

/**
 * Options that can be provided to the store.
 */
export interface StoreOptions<T> {
  /**
   * Name of the state. Required.
   */
  name: string | StateToken<T>;

  /**
   * Default values for the state. If not provided, uses empty object.
   */
  defaults?: T;

  /**
   * Sub states for the given state.
   */
  children?: ɵStateClass[];
}

/**
 * Represents a basic change from a previous to a new value for a single state instance.
 * Passed as a value in a NgxsSimpleChanges object to the ngxsOnChanges hook.
 */
export class NgxsSimpleChange<T = any> {
  constructor(
    public readonly previousValue: T,
    public readonly currentValue: T,
    public readonly firstChange: boolean
  ) {}
}

/**
 * On init interface
 */
export interface NgxsOnInit {
  ngxsOnInit(ctx: StateContext<any>): void;
}

/**
 * On change interface
 */
export interface NgxsOnChanges {
  ngxsOnChanges(change: NgxsSimpleChange): void;
}

/**
 * After bootstrap interface
 */
export interface NgxsAfterBootstrap {
  ngxsAfterBootstrap(ctx: StateContext<any>): void;
}

export type NgxsModuleOptions = Partial<NgxsConfig>;

/** @internal */
declare global {
  const ngDevMode: boolean;
}
