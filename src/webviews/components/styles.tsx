import styled from 'styled-components';

export const MarginAuto = styled.div`
margin: auto;
`;

export const Spacer = styled.div`
margin-left: 10px;
margin-right: 10px;
`;

export const VerticalPadding = styled.div`
padding-top: 10px;
padding-bottom: 10px;
`;

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
width: 100%;
`;

export const FlexCentered = styled.div`
display: flex;
align-items: center;
`;

export const BlockCentered = styled.div`
display: block;
text-align: center;
margin: 20px;
`;

export const TextFieldStyles = () => {
    let style = {
        backgroundColor: 'var(--vscode-input-background)',
        backgroundColorFocus: 'var(--vscode-input-background)',
        backgroundColorHover: 'var(--background-color--darken-05)',
        // borderColor: 'var(--vscode-input-border)',
        borderColorFocus: 'var(--vscode-inputOption-activeBorder)',
        borderColorHover: 'var(--vscode-inputOption-activeBorder)',
        textColor: 'var(--vscode-input-foreground)'
    };

    if(document.getElementsByClassName('vscode-dark').length > 0) {
        style = {...style, backgroundColorHover: 'var(--background-color--lighten-05)'};
    }

    return style;
};

export const TextAreaStyles = () => {
    let style = {
        backgroundColor: 'var(--vscode-input-background)',
        backgroundColorFocus: 'var(--vscode-input-background)',
        backgroundColorHover: 'var(--background-color--darken-05)',
        // borderColor: 'var(--vscode-input-border)',
        borderColorFocus: 'var(--vscode-inputOption-activeBorder)',
        borderColorHover: 'var(--vscode-inputOption-activeBorder)',
        textColor: 'var(--vscode-input-foreground)'
    };

    if(document.getElementsByClassName('vscode-dark').length > 0) {
        style = {...style, backgroundColorHover: 'var(--background-color--lighten-05)'};
    }

    return style;
};

export const SelectStyles = () => {
    const backgroundColorActive = document.getElementsByClassName('vscode-dark').length > 0 ? 'var(--background-color--lighten-05)' :  'var(--background-color--darken-05)';

    return {
        option: (styles: any, state: any) => ({
            ...styles,
            color: 'var(--vscode-input-foreground)',
            backgroundColor: state.isSelected ? backgroundColorActive : 'var(--vscode-input-background)'
        }),
        singleValue: (styles: any, state: any) => ({
            ...styles,
            color: 'var(--vscode-input-foreground)'
        }),
        input: (styles: any, state: any) => ({
            ...styles,
            color: 'var(--vscode-input-foreground)',
            backgroundColor: 'var(--vscode-input-background)'
        }),
        control: (styles: any, state: any) => ({
            ...styles,
            color: 'var(--vscode-input-foreground)',
            backgroundColor: 'var(--vscode-input-background)',
            ':hover': {
                backgroundColor: backgroundColorActive,
                borderColor: 'var(--vscode-inputOption-activeBorder)'
            }
        })
    };
};
