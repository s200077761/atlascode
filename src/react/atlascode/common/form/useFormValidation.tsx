import { useCallback } from 'react';
import useConstant from 'use-constant';

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type ValidationResult = string | undefined;
type ValidateFunc = (data: any) => ValidationResult | Promise<ValidationResult>;

type FieldDescriptor = {
    inputRef: InputElement;
    error: ValidationResult;
    touched: boolean;
    validator: ValidateFunc | undefined;
};

type Fields = {
    [k: string]: FieldDescriptor;
};
// function isCheckboxOrRadio(element?: InputElement): element is HTMLInputElement {
//     return !!element && (element.type === 'checkbox' || element.type === 'radio');
// }

const handleChange = (e: Event) => {
    console.log('changed', event);
};

export const useFormValidation = () => {
    const fields = useConstant<Fields>(() => ({}));

    const doRegister = useCallback(
        (ref: InputElement | null, validate?: ValidateFunc) => {
            console.log('registering', ref);
            if (ref) {
                if (!ref.name) {
                    return console.warn('ref is missing name @ when trying to register form validation', ref);
                }

                fields[ref.name] = {
                    inputRef: ref,
                    error: undefined,
                    touched: false,
                    validator: validate
                };

                ref.addEventListener('input', handleChange);
            }
        },
        [fields]
    );
    function register<Element extends InputElement = InputElement>(): (ref: Element | null) => void;
    function register<Element extends InputElement = InputElement>(
        validate: ValidateFunc
    ): (ref: Element | null) => void;
    function register<Element extends InputElement = InputElement>(
        ref?: Element,
        validate?: ValidateFunc
    ): ((ref: Element | null) => void) | void {
        console.log('calling register');
        if (ref) {
            doRegister(ref);
            return;
        }
        return doRegister;
    }

    return useCallback(register, []);
};
