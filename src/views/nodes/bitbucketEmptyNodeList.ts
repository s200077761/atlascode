import { EmptyNode } from "./emptyStateBaseNode";

export const emptyBitbucketNodes: EmptyNode[] = [
    new EmptyNode('No Bitbucket repositories found.'),
    new EmptyNode('Please make sure you have a project open that was cloned from Bitbucket.'),
    new EmptyNode('You can check your open repositories in the Source Control pane (Ctrl+Shift+G).'),
];