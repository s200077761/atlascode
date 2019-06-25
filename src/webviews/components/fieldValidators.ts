// used to chain onChange function so we can provide custom functionality after internal state changes
export const chain = (...fns: any[]) => (...args: any[]) => fns.forEach(fn => fn(...args));

export namespace FieldValidators {
    export function validateSingleSelect(value: string, state: any): string | undefined {
        return (value !== undefined) ? undefined : "EMPTY";
    }

    export function validateMultiSelect(value: string, state: any): string | undefined {
        return undefined;
        //return (value !== undefined && value.length > 0) ? undefined : "EMPTY";
    }

    export function validateString(value: string, state: any): string | undefined {
        return (value === undefined || value.length < 1) ? 'EMPTY' : undefined;
    }

    export function validateNumber(value: any, state: any): string | undefined {
        let err = undefined;

        if (value !== undefined && value.length > 0) {
            err = (isNaN(value)) ? 'NOT_NUMBER' : undefined;
        }


        return err;
    }

    export function validateUrl(value: string, state: any): string | undefined {
        let err = undefined;

        try {
            const url = new URL(value);
            if (url.hostname === '') {
                err = 'NOT_URL';
            }
        } catch (e) {
            err = 'NOT_URL';
        }

        return err;
    }

    export function validateRequiredNumber(value: any, state: any): string | undefined {
        let err = validateString(value, state);

        if (err === undefined) {
            err = (isNaN(value)) ? 'NOT_NUMBER' : undefined;
        }

        return err;
    }

    export function validateRequiredUrl(value: string, state: any): string | undefined {
        let err = validateString(value, state);

        if (err === undefined) {
            err = validateUrl(value, state);
        }

        return err;
    }
}
