import * as https from 'https';
import "mocha";
import { assert } from 'chai';

import * as bindle from '../../ts/index';

https.globalAgent.options.rejectUnauthorized = false;

describe("Bindle", () => {
    it("fetches the sample bindle", async () => {
        const client = new bindle.BindleClient('https://bindle.deislabs.io/v1');
        const invoice = await client.getInvoice('enterprise.com/warpcore/1.0.0');
        assert.equal('1.0.0', invoice.bindleVersion);
        assert.equal('enterprise.com/warpcore', invoice.bindle.name);
        assert.equal('main', invoice.annnotations['engineering_location']);
        assert.equal(1, invoice.parcels.length);
        assert.equal('isolinear_chip.txt', invoice.parcels[0].label.name);
    });
});
