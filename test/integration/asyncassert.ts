import { assert } from 'chai';

export async function throws(f: () => Promise<void>): Promise<void> {
    try {
        await f();
    } catch {
        return;
    }
    assert.fail('expected function to throw but did not');
}