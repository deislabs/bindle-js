import axios, { AxiosRequestConfig } from 'axios';
import * as https from 'https';
import * as toml from '@iarna/toml';

import { Invoice, QueryOptions, QueryResult } from './types';
import { InvoiceParseError, parseInvoice, parseQueryResult } from './parser';

const INVOICE_PATH = '_i';
const QUERY_PATH = '_q';

export class BindleClient {
    constructor(
        private readonly baseUrl: string,
        private agent?: https.Agent
    ) {}

    requestConfig(): AxiosRequestConfig | undefined {
        if (this.agent) {
            return { httpsAgent: this.agent };
        }
        return undefined;
    }

    public async getInvoice(id: string): Promise<Invoice> {
        const path = `/${INVOICE_PATH}/${id}`;
        const response = await axios.get<string>(this.baseUrl + path, this.requestConfig());
        const tomlText = response.data;
        const tomlParsed = toml.parse(tomlText);
        const invoice = parseInvoice(tomlParsed);
        if (invoice.succeeded) {
            return invoice.value;
        }
        throw new BindleClientError('Invoice parse error', invoice.error);
    }

    public async queryInvoices(options: QueryOptions): Promise<QueryResult> {
        const query = queryStringFrom(options);
        const path = `/${QUERY_PATH}${query}`;
        const response = await axios.get<string>(this.baseUrl + path, this.requestConfig());
        const tomlText = response.data;
        const tomlParsed = toml.parse(tomlText);
        const queryResult = parseQueryResult(tomlParsed);
        if (queryResult.succeeded) {
            return queryResult.value;
        }
        throw new BindleClientError('Invoice query error', queryResult.error);
    }
}

export class BindleClientError extends Error {
    constructor(message: string, readonly details: InvoiceParseError) {
        super(message);
    }
}

function queryStringFrom(options: QueryOptions): string {
    const factors = Array.of<string>();

    const mappings = [
        ['q', options.query],
        ['v', options.version],
        ['o', options.offset],
        ['l', options.limit],
        ['strict', options.strict],
        ['yanked', options.yanked],
    ];

    for (const [key, opt] of mappings) {
        if (opt !== undefined) {
            factors.push(`${key}=${opt}`);
        }
    }

    if (factors.length === 0) {
        return '';
    }
    return `?${factors.join('&')}`;
}
