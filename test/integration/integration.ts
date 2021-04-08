import * as https from 'https';
import "mocha";
import { assert } from 'chai';

import * as bindle from '../../ts/index';
import { Invoice } from '../../ts/index';

import * as asyncassert from './asyncassert';

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
        assert.equal('main', invoice.annotations['engineering_location']);
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
    it("creates invoices", async () => {
        // TODO: this results in creating the invoice, so it can't be run twice!
        // For now you need to delete test/data/invoices/8fb420... and restart the Bindle server
        const invoice: Invoice = {
            bindleVersion: '1.0.0',
            yanked: false,
            bindle: {
                name: 'bernards/abominable/bindle',
                version: '0.0.1',
                description: 'an abominable bindle',
                authors: ['some chap named Bernard'],
            },
            annotations: {
                penguinType: 'adelie',
            },
            parcels: [
                {
                    label: {
                        name: 'gary',
                        sha256: 'f7f3b33707fb76d208f5839a40e770452dcf9f348bfd7faf2c524e0fa6710ed6',
                        mediaType: 'text/plain',
                        size: 15,
                        annotations: {},
                        feature: {},
                    },
                    conditions: undefined,
                },
                {
                    label: {
                        name: 'keith',
                        sha256: '45678',
                        mediaType: 'text/plain',
                        size: 20,
                        annotations: {},
                        feature: {},
                    },
                    conditions: undefined,
                },
            ],
            groups: [
                { name: 'group1', required: true, satisfiedBy: 'allOf' },
            ]
        };
        const createResult = await client.createInvoice(invoice);
        assert.equal(1, createResult.missingParcels.length);
        const fetched = await client.getInvoice('bernards/abominable/bindle/0.0.1');
        assert.equal(invoice.annotations.penguinType, fetched.annotations.penguinType);
        assert.equal(invoice.parcels.length, fetched.parcels.length);
        assert.equal(invoice.groups.length, fetched.groups.length);
    });
    it("yanks invoices", async () => {
        await client.yankInvoice('your/fancy/bindle/0.3.0');
        await asyncassert.throws(async () => {
            await client.getInvoice('your/fancy/bindle/0.3.0');
        });
        const invoice = await client.getInvoice('your/fancy/bindle/0.3.0', { includeYanked: true });
        assert.equal('your/fancy/bindle', invoice.bindle.name);
    });
    it("fetches parcels", async () => {
        const parcel = await client.getParcel('mybindle/0.1.0', 'f7f3b33707fb76d208f5839a40e770452dcf9f348bfd7faf2c524e0fa6710ed6');
        assert.equal('Fie on you Gary', parcel.toString());
    });
    it("creates parcels", async () => {
        await client.createParcel('mybindle/0.1.0', '460d5965e4d1909e8c7a3748a414956b7038ab5fd79937c9fcb2b214e6b0160a', Buffer.from('The front fell off', 'utf8'));
        const fetched = await client.getParcel('mybindle/0.1.0', '460d5965e4d1909e8c7a3748a414956b7038ab5fd79937c9fcb2b214e6b0160a');
        assert.equal('The front fell off', fetched.toString());
    });
});
