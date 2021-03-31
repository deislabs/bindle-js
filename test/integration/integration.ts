import * as https from 'https';
import "mocha";
import { assert } from 'chai';

import * as bindle from '../../ts/index';

const testAgent = new https.Agent({ rejectUnauthorized: false });
const DEMO_SERVER_URL = 'https://bindle.deislabs.io/v1';
const client = new bindle.BindleClient(DEMO_SERVER_URL, testAgent);

describe("Bindle", () => {
    it("fetches the sample bindle", async () => {
        const invoice = await client.getInvoice('enterprise.com/warpcore/1.0.0');
        assert.equal('1.0.0', invoice.bindleVersion);
        assert.equal('enterprise.com/warpcore', invoice.bindle.name);
        assert.equal('main', invoice.annnotations['engineering_location']);
        assert.equal(1, invoice.parcels.length);
        assert.equal('isolinear_chip.txt', invoice.parcels[0].label.name);
    });
    // TODO: re-enable once query implementation is clarified
    // it("queries the sample registry", async () => {
    //     const qr = await client.queryInvoices({ query: 'warpcore' });
    //     assert.equal(1, qr.total);
    //     assert.equal(1, qr.invoices.length);
    // });
});
