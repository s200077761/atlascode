import { useRef } from 'react';

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type ValidationResult = string | undefined;
type ValidateFunc = (data: any) => ValidationResult | Promise<ValidationResult>;

type FieldDescriptor = {
    inputRef: InputElement;
    error: ValidationResult;
    touched: boolean;
};

type Fields = {
    [k: string]: FieldDescriptor;
};
function isCheckboxOrRadio(element?: InputElement): element is HTMLInputElement {
    return !!element && (element.type === 'checkbox' || element.type === 'radio');
}

export const useFormValidation = () => {
    const fields = useRef<Fields>({});
    function register<Element extends InputElement = InputElement>(
        validate?: ValidateFunc
    ): (ref: Element | null) => void {
        return (ref: Element | null) => {
            if (ref) {
                if (!ref.name) {
                    return console.warn('ref is missing name @ when trying to register form validation', ref);
                }

                fields.current[ref.name] = {
                    inputRef: ref,
                    error: undefined,
                    touched: false
                };
            }
        };
    }

    // const register = useCallback((ref: HTMLInputElement | null) => {
    //     if (ref) {
    //         if (!ref.name) {
    //             return console.warn('ref is missing name @ when trying to register form validation', ref);
    //         }
    //         const { type, value, checked } = ref;
    //         console.log('ref', type, value, checked);
    //     }
    // }, []);

    return register;
};
