import { SwitchWithLabel } from '@atlassianlabs/guipi-core-components';
import React, { memo, useContext } from 'react';
import { ConfigControllerContext } from '../configController';

type ContextMenuProps = {
    enabled: boolean;
};

export const ContextMenus: React.FunctionComponent<ContextMenuProps> = memo(({ enabled }) => {
    const controller = useContext(ConfigControllerContext);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const changes = Object.create(null);
        changes['bitbucket.contextMenus.enabled'] = e.target.checked;
        controller.updateConfig(changes);
    };

    return (
        <SwitchWithLabel
            size="small"
            color="primary"
            id="bitbucketContextMenusEnabled"
            checked={enabled}
            onChange={handleChange}
            label={enabled ? `Disable Bitbucket context menus in editor` : `Enable Bitbucket context menus in editor`}
        />
    );
});
