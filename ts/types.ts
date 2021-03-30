export type Dictionary<T> = { [key: string]: T };

export interface Invoice {
    readonly bindleVersion: '1.0.0';
    readonly yanked: boolean;
    readonly bindle: BindleMetadata;
    readonly annnotations: Dictionary<string>;
    readonly parcels: ReadonlyArray<Parcel>;
    readonly groups: ReadonlyArray<Group>;
}

export interface BindleMetadata {
    readonly name: string;
    readonly version: string;
    readonly description: string | undefined;
    readonly authors: ReadonlyArray<string>;
}

export interface Parcel {
    readonly label: Label;
    readonly conditions: Conditions | undefined;
}

export interface Label {
    readonly name: string;
    readonly sha256: string;
    readonly mediaType: string;
    readonly size: number;
    readonly annotations: Dictionary<string>;
    readonly feature: Dictionary<Dictionary<string>>;
}

export interface Conditions {
    readonly memberOf: ReadonlyArray<string>;
    readonly requires: ReadonlyArray<string>;
}

export interface Group {
    readonly name: string;
    readonly required: boolean;
    readonly satisfiedBy: 'allOf' | 'oneOf' | 'optional';
}
