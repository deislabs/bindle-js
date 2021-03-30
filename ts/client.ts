import axios, { AxiosRequestConfig } from 'axios';
import * as https from 'https';
import * as toml from '@iarna/toml';

import { Invoice } from './types';
import { InvoiceParseError, parseInvoice } from './parser';

const INVOICE_PATH = '_i';

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
}

export class BindleClientError extends Error {
    constructor(message: string, readonly details: InvoiceParseError) {
        super(message);
    }
}