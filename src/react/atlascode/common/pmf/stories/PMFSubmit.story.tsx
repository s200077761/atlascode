import React, { useCallback, useState } from 'react';
import { PMFData } from '../../../../../lib/ipc/models/common';
import { PMFDialog } from '../PMFDialog';
export default {
    title: 'Common/pmf/PMFSubmit',
};

export const ShowPMFDialog = () => {
    const [open, setOpen] = useState(true);

    const handleCancel = useCallback(() => {
        setOpen(false);
    }, []);

    const handleSave = useCallback((pmfData: PMFData) => {
        console.log('saving PMF', pmfData);
    }, []);

    return <PMFDialog open={open} onCancel={handleCancel} onSave={handleSave} />;
};
