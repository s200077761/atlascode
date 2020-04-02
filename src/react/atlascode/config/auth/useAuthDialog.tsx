import { createContext, useCallback, useMemo, useState } from 'react';
import { Product, ProductJira } from '../../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';

interface AuthDialogController {
    openDialog: (product: Product, entry?: SiteWithAuthInfo) => void;
    onClose: () => void;
}

const emptyController: AuthDialogController = {
    openDialog: (product: Product, entry?: SiteWithAuthInfo) => {},
    onClose: () => {}
};
export const AuthDialogControllerContext = createContext<AuthDialogController>(emptyController);

export const useAuthDialog = () => {
    const [authDialogOpen, setOpen] = useState(false);
    const [authDialogEntry, setAuthEntry] = useState<SiteWithAuthInfo | undefined>(undefined);
    const [authDialogProduct, setProduct] = useState<Product>(ProductJira);

    const openDialog = useCallback((product: Product, entry?: SiteWithAuthInfo) => {
        setAuthEntry(entry);
        setProduct(product);
        setOpen(true);
    }, []);

    const onClose = useCallback(() => {
        setAuthEntry(undefined);
        setOpen(false);
    }, []);

    const authDialogController = useMemo(() => {
        return { onClose, openDialog };
    }, [onClose, openDialog]);

    return {
        authDialogController,
        authDialogProduct,
        authDialogOpen,
        authDialogEntry
    };
};
