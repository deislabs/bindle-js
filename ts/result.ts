export interface Succeeded<T> {
    readonly succeeded: true;
    readonly value: T;
}

export interface Failed<E> {
    readonly succeeded: false;
    readonly error: E;
}

export type Result<T, E> = Succeeded<T> | Failed<E>;

export namespace Result {
    export function ok<T, E>(t: T): Result<T, E> {
        return { succeeded: true, value: t };
    }
    export function fail<T, E>(e: E): Result<T, E> {
        return { succeeded: false, error: e };
    }
    export function allOk<T, E>(rs: Result<T, E>[]): Result<T[], E> {
        const result = Array.of<T>();
        for (const r of rs) {
            if (r.succeeded) {
                result.push(r.value);
            } else {
                return r;
            }
        }
        return Result.ok(result);
    }
}
