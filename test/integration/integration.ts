import * as https from 'https';
import "mocha";
import { assert } from 'chai';

import * as bindle from '../../ts/index';

// To run this against the data assumed in the integration tests, run the Bindle server
// to serve files on port 14044 from the test/data directory.  If you have Rust installed you can
// do by cloning the Bindle repo and running:
//
// RUST_LOG=info cargo run --bin bindle-server --features="cli" -- -i 127.0.0.1:14044 -d <this_repo>/test/data

const testAgent = new https.Agent({ rejectUnauthorized: false });
const DEMO_SERVER_URL = 'http://localhost:14044/v1';
const client = new bindle.BindleClient(DEMO_SERVER_URL, testAgent);

describe("Bindle", () => {
    it("fetches the sample bindle", async () => {
        const invoice = await client.getInvoice('your/fancy/bindle/0.3.0');
        assert.equal('1.0.0', invoice.bindleVersion);
        assert.equal('your/fancy/bindle', invoice.bindle.name);
        assert.equal('main', invoice.annnotations['engineering_location']);
        assert.equal(4, invoice.parcels.length);
        assert.equal('daemon', invoice.parcels[0].label.name);
        assert.equal(3, invoice.groups.length);
        assert.equal('server', invoice.groups[0].name);
    });
    // TODO: re-enable once query implementation is clarified
    // it("queries the sample registry", async () => {
    //     const qr = await client.queryInvoices({ query: 'fancy' });
    //     assert.equal(2, qr.total);
    //     assert.equal(2, qr.invoices.length);
    // });
    it("fetches yanked bindles", async () => {
        const invoice = await client.getInvoice('yourbindle/0.1.1', { includeYanked: true });
        assert.equal('1.0.0', invoice.bindleVersion);
        assert.equal('yourbindle', invoice.bindle.name);
        assert.equal(3, invoice.parcels.length);
    });
});
