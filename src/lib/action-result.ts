export type FieldErrors = Record<string, string[]>;

export type ActionSuccess<T> = { ok: true; message?: string; data: T };
export type ActionFailure = { ok: false; message: string; fieldErrors?: FieldErrors };

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function actionError(message: string, fieldErrors?: FieldErrors): ActionFailure {
  return { ok: false, message, fieldErrors };
}

export function actionOk(message?: string): ActionSuccess<undefined>;
export function actionOk<T>(message: string | undefined, data: T): ActionSuccess<T>;
export function actionOk<T>(message?: string, data?: T): ActionSuccess<T | undefined> {
  return { ok: true, message, data };
}
