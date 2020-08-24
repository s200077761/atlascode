import { createContext, useCallback, useMemo, useState } from 'react';
import { Product, ProductJira } from '../../../../atlclients/authInfo';

interface CodeEntryDialogController {
    openDialog: (product: Product) => void;
    close: () => void;
}

const emptyController: CodeEntryDialogController = {
    openDialog: (product: Product) => {},
    close: () => {},
};
export const CodeEntryDialogControllerContext = createContext<CodeEntryDialogController>(emptyController);

export const useCodeEntryDialog = () => {
    const [codeEntryDialogOpen, setOpen] = useState(false);
    const [codeEntryDialogProduct, setProduct] = useState<Product>(ProductJira);

    const openDialog = useCallback((product: Product) => {
        setProduct(product);
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const codeEntryDialogController = useMemo(() => {
        return { close, openDialog };
    }, [close, openDialog]);

    return {
        codeEntryDialogController: codeEntryDialogController,
        codeEntryDialogProduct: codeEntryDialogProduct,
        codeEntryDialogOpen: codeEntryDialogOpen,
    };
};
