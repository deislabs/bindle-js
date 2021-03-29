import axios from 'axios';
import * as toml from '@iarna/toml';

import { Invoice } from './types';
import { parseInvoice } from './parser';

const INVOICE_PATH = '_i';

export class BindleClient {
    constructor(private readonly baseUrl: string) {}

    public async getInvoice(id: string): Promise<Invoice> {
        const path = `/${INVOICE_PATH}/${id}`;
        const response = await axios.get<string>(this.baseUrl + path);
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
    constructor(message: string, readonly details: any) {
        super(message);
    }
}