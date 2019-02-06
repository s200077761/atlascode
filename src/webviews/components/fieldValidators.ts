 // used to chain onChange function so we can provide custom functionality after internal state changes
 export const chain = (...fns:any[]) => (...args:any[]) => fns.forEach(fn => fn(...args));
 
export namespace FieldValidators {
    export function validateSingleSelect(value:string, state:any):string|undefined {
        return (value !== undefined) ? undefined : "EMPTY";
    }
    
    export function validateMultiSelect(value:string, state:any):string|undefined {
        return undefined;
        //return (value !== undefined && value.length > 0) ? undefined : "EMPTY";
    }
    
    export function validateString(value:string, state:any):string|undefined {
        return (value === undefined || value.length < 1) ? 'EMPTY' : undefined;
    }
    
    export function validateNumber(value:any, state:any):string|undefined {
        let err = undefined;
    
        // if(value !== undefined && value.length > 0) {
        //     err = (isNaN(value)) ? 'NOT_NUMBER' : undefined;
        // }
    
        console.log('validate number returning',err);
    
        return err;
    }
    
    export function validateUrl(value:string, state:any):string|undefined {
        let err = undefined;
    
        // if(value !== undefined && value.length > 0) {
        //     err = (!this.validURL(value)) ? 'NOT_URL' : undefined;
        // }
    
        console.log('validate url returning',err);
        return err;
    }
    
    export function validateRequiredNumber(value:any, state:any):string|undefined {
        let err = validateString(value,state);
    
        // if(err === undefined) {
        //     err = (isNaN(value)) ? 'NOT_NUMBER' : undefined;
        // }
    
        return err;
    }
    
    export function validateRequiredUrl(value:string, state:any):string|undefined {
        let err = validateString(value,state);
    
        // if(err === undefined) {
        //     err = (!this.validURL(value)) ? 'NOT_URL' : undefined;
        // }
    
        return err;
    }
}
