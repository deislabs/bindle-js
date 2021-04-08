import { AnyJson, JsonMap, JsonArray } from '@iarna/toml';

import { Result } from './result';
import { BindleMetadata, Conditions, CreateInvoiceResult, Dictionary, Group, Invoice, Label, Parcel, QueryResult } from './types';

export type InvoiceParseError =
    { reason: 'not-a-map' } |
    { reason: 'missing-required-field'; fieldName: string } |
    { reason: 'invalid-field-value'; fieldName: string } |
    { reason: 'unknown-bindle-version'; actualVersion: string };

export function parseInvoice(toml: JsonMap): Result<Invoice, InvoiceParseError> {
    const bindleVersion = toml['bindleVersion'] as string | undefined;

    if (!bindleVersion) {
        return Result.fail({ reason: 'missing-required-field', fieldName: 'bindleVersion' });
    }
    if (bindleVersion !== '1.0.0') {
        return Result.fail({ reason: 'unknown-bindle-version', actualVersion: bindleVersion });
    }

    const yanked = toml['yanked'] || false;
    if (!(yanked === true || yanked === false)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'yanked' });
    }

    const bindle = parseBindleMetadata(toml['bindle']);
    if (!bindle.succeeded) {
        return bindle;
    }

    const annotations = parseAnnotations(toml['annotations']);
    if (!annotations.succeeded) {
        return annotations;
    }

    const parcels = parseParcels(toml['parcel']);
    if (!parcels.succeeded) {
        return parcels;
    }

    const groups = parseGroups(toml['group']);
    if (!groups.succeeded) {
        return groups;
    }

    return Result.ok({
        bindleVersion,
        yanked,
        bindle: bindle.value,
        annotations: annotations.value,
        parcels: parcels.value,
        groups: groups.value,
    });
}

function parseBindleMetadata(toml: AnyJson): Result<BindleMetadata, InvoiceParseError> {
    const bindle = toml as JsonMap | undefined;
    if (!bindle) {
        return Result.fail({ reason: 'missing-required-field', fieldName: 'bindle' });
    }

    const name = strValue(bindle, 'name', 'bindle');
    if (!name.succeeded) {
        return name;
    }

    const version = strValue(bindle, 'version', 'bindle');
    if (!version.succeeded) {
        return version;
    }
    // TODO: validate formatting

    const authors = strArrayValue(bindle, 'authors', 'bindle');
    if (!authors.succeeded) {
        return authors;
    }

    const description = bindle['description'] as string | undefined;

    return Result.ok({
        name: name.value,
        version: version.value,
        description,
        authors: authors.value
    });
}

function parseAnnotations(toml: AnyJson): Result<Dictionary<string>, InvoiceParseError> {
    const annotations = toml as JsonMap | undefined;
    if (!annotations) {
        return Result.ok({});
    }

    if (!isStringDictionary(annotations)) {
        // TODO: return which annotation is bad
        return Result.fail({ reason: 'invalid-field-value', fieldName: `annotations` });
    }

    return Result.ok(annotations);
}

function parseParcels(toml: AnyJson): Result<Parcel[], InvoiceParseError> {
    const parcels = toml as JsonArray | undefined;
    if (!parcels) {
        return Result.ok([]);
    }

    if (!isJsonMapArray(parcels)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'parcels' });
    }

    return Result.allOk(parcels.map(parseParcel));
}

function parseParcel(toml: JsonMap): Result<Parcel, InvoiceParseError> {
    // TODO: take an AnyJson and confirm it's a JsonMap
    const label = parseLabel(toml['label']);
    if (!label.succeeded) {
        return label;
    }

    const conditions = parseConditions(toml['conditions']);
    if (!conditions.succeeded) {
        return conditions;
    }

    return Result.ok({
        label: label.value,
        conditions: conditions.value,
    });
}

function parseLabel(toml: AnyJson | undefined): Result<Label, InvoiceParseError> {
    if (!toml) {
        return Result.fail({ reason: 'missing-required-field', fieldName: 'parcel.label' });
    }
    if (!isJsonMap(toml)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'parcel.label' });
    }

    const name = strValue(toml, 'name', 'parcel.label');
    if (!name.succeeded) {
        return name;
    }

    const sha256 = strValue(toml, 'sha256', 'parcel.label');
    if (!sha256.succeeded) {
        return sha256;
    }

    const mediaType = strValue(toml, 'mediaType', 'parcel.label');
    if (!mediaType.succeeded) {
        return mediaType;
    }

    const size = numValue(toml, 'size', 'parcel.label');
    if (!size.succeeded) {
        return size;
    }

    const annotations = toml['annotations'] || {};
    if (!isJsonMap(annotations) || !isStringDictionary(annotations)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'parcel.label.annotations' });
    }

    const features = toml['features'] || {};
    if (!isJsonMap(features) || !isFeatureDictionary(features)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'parcel.label.features' });
    }

    return Result.ok({
        name: name.value,
        sha256: sha256.value,
        mediaType: mediaType.value,
        size: size.value,
        annotations: annotations,
        feature: features,

    });
}

function parseConditions(toml: AnyJson | undefined): Result<(Conditions | undefined), InvoiceParseError> {
    if (!toml) {
        return Result.ok(undefined);
    }
    if (!isJsonMap(toml)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'parcel.conditions' });
    }

    const memberOf = strArrayValue(toml, 'memberOf', 'parcel.conditions');
    if (!memberOf.succeeded) {
        return memberOf;
    }

    const requires = strArrayValue(toml, 'requires', 'parcel.conditions');
    if (!requires.succeeded) {
        return requires;
    }

    return Result.ok({
        memberOf: memberOf.value,
        requires: requires.value,
    });
}

function parseGroups(toml: AnyJson): Result<Group[], InvoiceParseError> {
    const groups = toml as JsonArray | undefined;
    if (!groups) {
        return Result.ok([]);
    }

    if (!isJsonMapArray(groups)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'groups' });
    }

    return Result.allOk(groups.map(parseGroup));
}

function parseGroup(toml: AnyJson | undefined): Result<Group, InvoiceParseError> {
    if (!toml) {
        return Result.fail({ reason: 'missing-required-field', fieldName: 'groups' });
    }
    if (!isJsonMap(toml)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'groups' });
    }

    const name = strValue(toml, 'name', 'group');
    if (!name.succeeded) {
        return name;
    }

    const required = toml['required'] || false;
    if (!(required === true || required === false)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'group.required' });
    }

    const satisfiedBy = defaultMissing(strValue(toml, 'satisfiedBy', 'group'), 'allOf');
    if (!satisfiedBy.succeeded) {
        return satisfiedBy;
    }
    if (!(satisfiedBy.value === 'allOf' || satisfiedBy.value === 'oneOf' || satisfiedBy.value === 'optional')) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'group.satisfiedBy' });
    }

    return Result.ok({
        name: name.value,
        required,
        satisfiedBy: satisfiedBy.value,
    });
}

export function parseQueryResult(toml: JsonMap): Result<QueryResult, InvoiceParseError /* TODO: okay type? */> {
    const query = strValue(toml, 'query', '');
    if (!query.succeeded) {
        return query;
    }

    const offset = numValue(toml, 'offset', '');
    if (!offset.succeeded) {
        return offset;
    }

    const limit = numValue(toml, 'limit', '');
    if (!limit.succeeded) {
        return limit;
    }

    const strict = boolValue(toml, 'strict', '');
    if (!strict.succeeded) {
        return strict;
    }

    const yanked = boolValue(toml, 'yanked', '');
    if (!yanked.succeeded) {
        return yanked;
    }

    const total = numValue(toml, 'total', '');
    if (!total.succeeded) {
        return total;
    }

    const more = boolValue(toml, 'more', '');
    if (!more.succeeded) {
        return more;
    }

    const invoices = arrayValue<Invoice>(toml, 'invoices', '', parseInvoice);
    if (!invoices.succeeded) {
        return invoices;
    }

    return Result.ok({
        query: query.value,
        offset: offset.value,
        limit: limit.value,
        strict: strict.value,
        yanked: yanked.value,
        total: total.value,
        more: more.value,
        invoices: invoices.value,
    });
}

export function parseMissingLabels(toml: AnyJson): Result<ReadonlyArray<Label>, InvoiceParseError> {
    if (!isJsonMap(toml)) {
        return Result.fail({ reason: 'not-a-map' });
    }

    const missing = toml['missing'];
    if (!Array.isArray(missing) || !isJsonMapArray(missing)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'missing' });
    }

    return Result.allOk(missing.map(parseLabel));
}

function isStringArray(arg: any[]): arg is string[] {
    return arg.every(isString);
}

function isStringDictionary(arg: { [key: string]: AnyJson }): arg is Dictionary<string> {
    return Object.values(arg).every(isString);
}

function isString(arg: any): arg is string {
    return typeof arg === 'string' || arg instanceof String;
}

function isJsonMapArray(arg: any[]): arg is JsonMap[] {
    return arg.every(isJsonMap);
}

function isJsonMap(arg: any): arg is JsonMap {
    // This isn't great but will do as the server shouldn't send us complete garbage
    return Object.keys(arg).every(isString);
}

function isFeatureDictionary(arg: { [key: string]: AnyJson }): arg is Dictionary<Dictionary<string>> {
    return Object.values(arg).every((v) => isJsonMap(v) && isStringDictionary(v));
}

function isNumber(arg: any): arg is number {
    return typeof arg === 'number';
}

function fieldName(parent: string, key: string): string {
    if (parent.length > 0) {
        return `${parent}.${key}`;
    }
    return key;
}

function strValue(map: JsonMap, key: string, parent: string): Result<string, InvoiceParseError> {
    const value = map[key];
    if (value === undefined) {
        return Result.fail({ reason: 'missing-required-field', fieldName: fieldName(parent, key) });
    }
    if (!isString(value)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    return Result.ok(value);
}

function strArrayValue(map: JsonMap, key: string, parent: string): Result<string[], InvoiceParseError> {
    const value = map[key];
    if (value === undefined) {
        return Result.ok([]);
    }
    if (!Array.isArray(value) || !isStringArray(value)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    return Result.ok(value);
}

function numValue(map: JsonMap, key: string, parent: string): Result<number, InvoiceParseError> {
    const value = map[key];
    if (value === undefined) {
        return Result.fail({ reason: 'missing-required-field', fieldName: fieldName(parent, key) });
    }
    if (!isNumber(value)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    return Result.ok(value);
}

function boolValue(map: JsonMap, key: string, parent: string): Result<boolean, InvoiceParseError> {
    const value = map[key];
    if (value === undefined) {
        return Result.fail({ reason: 'missing-required-field', fieldName: fieldName(parent, key) });
    }
    if (!(value === true || value === false)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    return Result.ok(value);
}

function arrayValue<T>(map: JsonMap, key: string, parent: string, parseOne: (v: JsonMap) => Result<T, InvoiceParseError>): Result<T[], InvoiceParseError> {
    const value = map[key];
    if (!value) {
        return Result.fail({ reason: 'missing-required-field', fieldName: fieldName(parent, key) });
    }
    if (!Array.isArray(value)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    if (!isJsonMapArray(value)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: fieldName(parent, key) });
    }
    return Result.allOk(value.map((v) => parseOne(v)));
}

function defaultMissing<T>(value: Result<T, InvoiceParseError>, defaultValue: T): Result<T, InvoiceParseError> {
    if (!value.succeeded && value.error.reason === 'missing-required-field') {
        return Result.ok(defaultValue);
    }
    return value;
}

export function jsoniseInvoice(invoice: Invoice): JsonMap {
    return {
        bindleVersion: invoice.bindleVersion,
        bindle: jsoniseBindleMetadata(invoice.bindle),
        annotations: invoice.annotations,
        parcel: invoice.parcels.map(jsoniseParcel),
        group: invoice.groups.map(jsoniseGroup),
    };
}

function jsoniseBindleMetadata(metadata: BindleMetadata): JsonMap {
    const map: JsonMap = {
        name: metadata.name,
        version: metadata.version,
        authors: Array.of(...metadata.authors),
    };
    if (metadata.description) {
        map.description = metadata.description;
    }
    return map;
}

function jsoniseParcel(parcel: Parcel): JsonMap {
    const map: JsonMap = {
        label: jsoniseLabel(parcel.label),
    };
    if (parcel.conditions) {
        map.conditions = jsoniseConditions(parcel.conditions);
    }
    return map;
}

function jsoniseLabel(label: Label): JsonMap {
    return { ...label };
}

function jsoniseConditions(conditions: Conditions): JsonMap {
    return {
        memberOf: Array.of(...conditions.memberOf),
        requires: Array.of(...conditions.requires),
    };
}

function jsoniseGroup(group: Group): JsonMap {
    return { ...group };
}

export function parseCreateInvoiceResult(toml: JsonMap): Result<CreateInvoiceResult, InvoiceParseError> {
    if (!isJsonMap(toml)) {
        return Result.fail({ reason: 'not-a-map' });
    }

    const invoiceTOML = toml['invoice'];
    if (!isJsonMap(invoiceTOML)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'invoice' });
    }
    const invoice = parseInvoice(invoiceTOML);
    if (!invoice.succeeded) {
        return invoice;
    }

    const missingTOML = toml['missing'] || [];
    if (!Array.isArray(missingTOML) || !isJsonMapArray(missingTOML)) {
        return Result.fail({ reason: 'invalid-field-value', fieldName: 'missing' });
    }
    const missing = Result.allOk(missingTOML.map(parseLabel));
    if (!missing.succeeded) {
        return missing;
    }

    return Result.ok({
        invoice: invoice.value,
        missingParcels: missing.value,
    });
}