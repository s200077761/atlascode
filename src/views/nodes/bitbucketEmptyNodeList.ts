import { SimpleNode } from "./simpleNode";

export const emptyBitbucketNodes: SimpleNode[] = [
    new SimpleNode('No Bitbucket repositories found.'),
    new SimpleNode('Please make sure you have a project open that was cloned from Bitbucket.'),
    new SimpleNode('You can check your open repositories in the Source Control pane (Ctrl+Shift+G).'),
];