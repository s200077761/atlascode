const body = document.body;

const computedStyle = getComputedStyle(body);
export const activityBarBackground = computedStyle.getPropertyValue('--vscode-activityBar-background').trim();
export const activityBarDropBackground = computedStyle.getPropertyValue('--vscode-activityBar-dropBackground').trim();
export const activityBarForeground = computedStyle.getPropertyValue('--vscode-activityBar-foreground').trim();
export const activityBarInactiveForeground = computedStyle
    .getPropertyValue('--vscode-activityBar-inactiveForeground')
    .trim();
export const activityBarBadgeBackground = computedStyle.getPropertyValue('--vscode-activityBarBadge-background').trim();
export const activityBarBadgeForeground = computedStyle.getPropertyValue('--vscode-activityBarBadge-foreground').trim();
export const badgeBackground = computedStyle.getPropertyValue('--vscode-badge-background').trim();
export const badgeForeground = computedStyle.getPropertyValue('--vscode-badge-foreground').trim();
export const breadcrumbActiveSelectionForeground = computedStyle
    .getPropertyValue('--vscode-breadcrumb-activeSelectionForeground')
    .trim();
export const breadcrumbBackground = computedStyle.getPropertyValue('--vscode-breadcrumb-background').trim();
export const breadcrumbFocusForeground = computedStyle.getPropertyValue('--vscode-breadcrumb-focusForeground').trim();
export const breadcrumbForeground = computedStyle.getPropertyValue('--vscode-breadcrumb-foreground').trim();
export const breadcrumbPickerBackground = computedStyle.getPropertyValue('--vscode-breadcrumbPicker-background').trim();
export const buttonBackground = computedStyle.getPropertyValue('--vscode-button-background').trim();
export const buttonForeground = computedStyle.getPropertyValue('--vscode-button-foreground').trim();
export const buttonHoverBackground = computedStyle.getPropertyValue('--vscode-button-hoverBackground').trim();
export const debugExceptionWidgetBackground = computedStyle
    .getPropertyValue('--vscode-debugExceptionWidget-background')
    .trim();
export const debugExceptionWidgetBorder = computedStyle.getPropertyValue('--vscode-debugExceptionWidget-border').trim();
export const debugToolBarBackground = computedStyle.getPropertyValue('--vscode-debugToolBar-background').trim();
export const descriptionForeground = computedStyle.getPropertyValue('--vscode-descriptionForeground').trim();
export const diffEditorInsertedTextBackground = computedStyle
    .getPropertyValue('--vscode-diffEditor-insertedTextBackground')
    .trim();
export const diffEditorRemovedTextBackground = computedStyle
    .getPropertyValue('--vscode-diffEditor-removedTextBackground')
    .trim();
export const dropdownBackground = computedStyle.getPropertyValue('--vscode-dropdown-background').trim();
export const dropdownBorder = computedStyle.getPropertyValue('--vscode-dropdown-border').trim();
export const editorBackground = computedStyle.getPropertyValue('--vscode-editor-background').trim();
export const editorFindMatchBackground = computedStyle.getPropertyValue('--vscode-editor-findMatchBackground').trim();
export const editorFindMatchHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-findMatchHighlightBackground')
    .trim();
export const editorFindRangeHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-findRangeHighlightBackground')
    .trim();
export const editorFocusedStackFrameHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-focusedStackFrameHighlightBackground')
    .trim();
export const editorFontFamily = computedStyle.getPropertyValue('--vscode-editor-font-family').trim();
export const editorFontSize = parseInt(computedStyle.getPropertyValue('--vscode-editor-font-size').trim());
export const editorFontWeight = computedStyle.getPropertyValue('--vscode-editor-font-weight').trim();
export const editorForeground = computedStyle.getPropertyValue('--vscode-editor-foreground').trim();
export const editorHoverHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-hoverHighlightBackground')
    .trim();
export const editorInactiveSelectionBackground = computedStyle
    .getPropertyValue('--vscode-editor-inactiveSelectionBackground')
    .trim();
export const editorLineHighlightBorder = computedStyle.getPropertyValue('--vscode-editor-lineHighlightBorder').trim();
export const editorRangeHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-rangeHighlightBackground')
    .trim();
export const editorSelectionBackground = computedStyle.getPropertyValue('--vscode-editor-selectionBackground').trim();
export const editorSelectionHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-selectionHighlightBackground')
    .trim();
export const editorSnippetFinalTabstopHighlightBorder = computedStyle
    .getPropertyValue('--vscode-editor-snippetFinalTabstopHighlightBorder')
    .trim();
export const editorSnippetTabstopHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-snippetTabstopHighlightBackground')
    .trim();
export const editorStackFrameHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-stackFrameHighlightBackground')
    .trim();
export const editorWordHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-wordHighlightBackground')
    .trim();
export const editorWordHighlightStrongBackground = computedStyle
    .getPropertyValue('--vscode-editor-wordHighlightStrongBackground')
    .trim();
export const editorActiveLineNumberForeground = computedStyle
    .getPropertyValue('--vscode-editorActiveLineNumber-foreground')
    .trim();
export const editorBracketMatchBackground = computedStyle
    .getPropertyValue('--vscode-editorBracketMatch-background')
    .trim();
export const editorBracketMatchBorder = computedStyle.getPropertyValue('--vscode-editorBracketMatch-border').trim();
export const editorCodeLensForeground = computedStyle.getPropertyValue('--vscode-editorCodeLens-foreground').trim();
export const editorCursorForeground = computedStyle.getPropertyValue('--vscode-editorCursor-foreground').trim();
export const editorErrorForeground = computedStyle.getPropertyValue('--vscode-editorError-foreground').trim();
export const editorGroupBorder = computedStyle.getPropertyValue('--vscode-editorGroup-border').trim();
export const editorGroupDropBackground = computedStyle.getPropertyValue('--vscode-editorGroup-dropBackground').trim();
export const editorGroupHeaderNoTabsBackground = computedStyle
    .getPropertyValue('--vscode-editorGroupHeader-noTabsBackground')
    .trim();
export const editorGroupHeaderTabsBackground = computedStyle
    .getPropertyValue('--vscode-editorGroupHeader-tabsBackground')
    .trim();
export const editorGutterAddedBackground = computedStyle
    .getPropertyValue('--vscode-editorGutter-addedBackground')
    .trim();
export const editorGutterBackground = computedStyle.getPropertyValue('--vscode-editorGutter-background').trim();
export const editorGutterCommentRangeForeground = computedStyle
    .getPropertyValue('--vscode-editorGutter-commentRangeForeground')
    .trim();
export const editorGutterDeletedBackground = computedStyle
    .getPropertyValue('--vscode-editorGutter-deletedBackground')
    .trim();
export const editorGutterModifiedBackground = computedStyle
    .getPropertyValue('--vscode-editorGutter-modifiedBackground')
    .trim();
export const editorHintForeground = computedStyle.getPropertyValue('--vscode-editorHint-foreground').trim();
export const editorHoverWidgetBackground = computedStyle
    .getPropertyValue('--vscode-editorHoverWidget-background')
    .trim();
export const editorHoverWidgetBorder = computedStyle.getPropertyValue('--vscode-editorHoverWidget-border').trim();
export const editorHoverWidgetStatusBarBackground = computedStyle
    .getPropertyValue('--vscode-editorHoverWidget-statusBarBackground')
    .trim();
export const editorIndentGuideActiveBackground = computedStyle
    .getPropertyValue('--vscode-editorIndentGuide-activeBackground')
    .trim();
export const editorIndentGuideBackground = computedStyle
    .getPropertyValue('--vscode-editorIndentGuide-background')
    .trim();
export const editorInfoForeground = computedStyle.getPropertyValue('--vscode-editorInfo-foreground').trim();
export const editorLineNumberActiveForeground = computedStyle
    .getPropertyValue('--vscode-editorLineNumber-activeForeground')
    .trim();
export const editorLineNumberForeground = computedStyle.getPropertyValue('--vscode-editorLineNumber-foreground').trim();
export const editorLinkActiveForeground = computedStyle.getPropertyValue('--vscode-editorLink-activeForeground').trim();
export const editorMarkerNavigationBackground = computedStyle
    .getPropertyValue('--vscode-editorMarkerNavigation-background')
    .trim();
export const editorMarkerNavigationErrorBackground = computedStyle
    .getPropertyValue('--vscode-editorMarkerNavigationError-background')
    .trim();
export const editorMarkerNavigationInfoBackground = computedStyle
    .getPropertyValue('--vscode-editorMarkerNavigationInfo-background')
    .trim();
export const editorMarkerNavigationWarningBackground = computedStyle
    .getPropertyValue('--vscode-editorMarkerNavigationWarning-background')
    .trim();
export const editorOverviewRulerAddedForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-addedForeground')
    .trim();
export const editorOverviewRulerBorder = computedStyle.getPropertyValue('--vscode-editorOverviewRuler-border').trim();
export const editorOverviewRulerBracketMatchForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-bracketMatchForeground')
    .trim();
export const editorOverviewRulerCommonContentForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-commonContentForeground')
    .trim();
export const editorOverviewRulerCurrentContentForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-currentContentForeground')
    .trim();
export const editorOverviewRulerDeletedForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-deletedForeground')
    .trim();
export const editorOverviewRulerErrorForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-errorForeground')
    .trim();
export const editorOverviewRulerFindMatchForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-findMatchForeground')
    .trim();
export const editorOverviewRulerIncomingContentForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-incomingContentForeground')
    .trim();
export const editorOverviewRulerInfoForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-infoForeground')
    .trim();
export const editorOverviewRulerModifiedForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-modifiedForeground')
    .trim();
export const editorOverviewRulerRangeHighlightForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-rangeHighlightForeground')
    .trim();
export const editorOverviewRulerSelectionHighlightForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-selectionHighlightForeground')
    .trim();
export const editorOverviewRulerWarningForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-warningForeground')
    .trim();
export const editorOverviewRulerWordHighlightForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-wordHighlightForeground')
    .trim();
export const editorOverviewRulerWordHighlightStrongForeground = computedStyle
    .getPropertyValue('--vscode-editorOverviewRuler-wordHighlightStrongForeground')
    .trim();
export const editorPaneBackground = computedStyle.getPropertyValue('--vscode-editorPane-background').trim();
export const editorRulerForeground = computedStyle.getPropertyValue('--vscode-editorRuler-foreground').trim();
export const editorSuggestWidgetBackground = computedStyle
    .getPropertyValue('--vscode-editorSuggestWidget-background')
    .trim();
export const editorSuggestWidgetBorder = computedStyle.getPropertyValue('--vscode-editorSuggestWidget-border').trim();
export const editorSuggestWidgetForeground = computedStyle
    .getPropertyValue('--vscode-editorSuggestWidget-foreground')
    .trim();
export const editorSuggestWidgetHighlightForeground = computedStyle
    .getPropertyValue('--vscode-editorSuggestWidget-highlightForeground')
    .trim();
export const editorSuggestWidgetSelectedBackground = computedStyle
    .getPropertyValue('--vscode-editorSuggestWidget-selectedBackground')
    .trim();
export const editorUnnecessaryCodeOpacity = computedStyle
    .getPropertyValue('--vscode-editorUnnecessaryCode-opacity')
    .trim();
export const editorWarningForeground = computedStyle.getPropertyValue('--vscode-editorWarning-foreground').trim();
export const editorWhitespaceForeground = computedStyle.getPropertyValue('--vscode-editorWhitespace-foreground').trim();
export const editorWidgetBackground = computedStyle.getPropertyValue('--vscode-editorWidget-background').trim();
export const editorWidgetBorder = computedStyle.getPropertyValue('--vscode-editorWidget-border').trim();
export const errorForeground = computedStyle.getPropertyValue('--vscode-errorForeground').trim();
export const extensionBadgeRemoteBackground = computedStyle
    .getPropertyValue('--vscode-extensionBadge-remoteBackground')
    .trim();
export const extensionBadgeRemoteForeground = computedStyle
    .getPropertyValue('--vscode-extensionBadge-remoteForeground')
    .trim();
export const extensionButtonProminentBackground = computedStyle
    .getPropertyValue('--vscode-extensionButton-prominentBackground')
    .trim();
export const extensionButtonProminentForeground = computedStyle
    .getPropertyValue('--vscode-extensionButton-prominentForeground')
    .trim();
export const extensionButtonProminentHoverBackground = computedStyle
    .getPropertyValue('--vscode-extensionButton-prominentHoverBackground')
    .trim();
export const focusBorder = computedStyle.getPropertyValue('--vscode-focusBorder').trim();
export const fontFamily = computedStyle.getPropertyValue('--vscode-font-family').trim();
export const fontSize = parseInt(computedStyle.getPropertyValue('--vscode-editor-font-size').trim());
export const fontWeight = computedStyle.getPropertyValue('--vscode-font-weight').trim();
export const foreground = computedStyle.getPropertyValue('--vscode-foreground').trim();
export const gitDecorationAddedResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-addedResourceForeground')
    .trim();
export const gitDecorationConflictingResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-conflictingResourceForeground')
    .trim();
export const gitDecorationDeletedResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-deletedResourceForeground')
    .trim();
export const gitDecorationIgnoredResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-ignoredResourceForeground')
    .trim();
export const gitDecorationModifiedResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-modifiedResourceForeground')
    .trim();
export const gitDecorationSubmoduleResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-submoduleResourceForeground')
    .trim();
export const gitDecorationUntrackedResourceForeground = computedStyle
    .getPropertyValue('--vscode-gitDecoration-untrackedResourceForeground')
    .trim();
export const gitlensGutterBackgroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-gutterBackgroundColor')
    .trim();
export const gitlensGutterForegroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-gutterForegroundColor')
    .trim();
export const gitlensGutterUncommittedForegroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-gutterUncommittedForegroundColor')
    .trim();
export const gitlensLineHighlightBackgroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-lineHighlightBackgroundColor')
    .trim();
export const gitlensLineHighlightOverviewRulerColor = computedStyle
    .getPropertyValue('--vscode-gitlens-lineHighlightOverviewRulerColor')
    .trim();
export const gitlensTrailingLineBackgroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-trailingLineBackgroundColor')
    .trim();
export const gitlensTrailingLineForegroundColor = computedStyle
    .getPropertyValue('--vscode-gitlens-trailingLineForegroundColor')
    .trim();
export const inputBackground = computedStyle.getPropertyValue('--vscode-input-background').trim();
export const inputForeground = computedStyle.getPropertyValue('--vscode-input-foreground').trim();
export const inputPlaceholderForeground = computedStyle.getPropertyValue('--vscode-input-placeholderForeground').trim();
export const inputOptionActiveBorder = computedStyle.getPropertyValue('--vscode-inputOption-activeBorder').trim();
export const inputValidationErrorBackground = computedStyle
    .getPropertyValue('--vscode-inputValidation-errorBackground')
    .trim();
export const inputValidationErrorBorder = computedStyle.getPropertyValue('--vscode-inputValidation-errorBorder').trim();
export const inputValidationInfoBackground = computedStyle
    .getPropertyValue('--vscode-inputValidation-infoBackground')
    .trim();
export const inputValidationInfoBorder = computedStyle.getPropertyValue('--vscode-inputValidation-infoBorder').trim();
export const inputValidationWarningBackground = computedStyle
    .getPropertyValue('--vscode-inputValidation-warningBackground')
    .trim();
export const inputValidationWarningBorder = computedStyle
    .getPropertyValue('--vscode-inputValidation-warningBorder')
    .trim();
export const listActiveSelectionBackground = computedStyle
    .getPropertyValue('--vscode-list-activeSelectionBackground')
    .trim();
export const listActiveSelectionForeground = computedStyle
    .getPropertyValue('--vscode-list-activeSelectionForeground')
    .trim();
export const listDropBackground = computedStyle.getPropertyValue('--vscode-list-dropBackground').trim();
export const listErrorForeground = computedStyle.getPropertyValue('--vscode-list-errorForeground').trim();
export const listFocusBackground = computedStyle.getPropertyValue('--vscode-list-focusBackground').trim();
export const listHighlightForeground = computedStyle.getPropertyValue('--vscode-list-highlightForeground').trim();
export const listHoverBackground = computedStyle.getPropertyValue('--vscode-list-hoverBackground').trim();
export const listInactiveSelectionBackground = computedStyle
    .getPropertyValue('--vscode-list-inactiveSelectionBackground')
    .trim();
export const listInvalidItemForeground = computedStyle.getPropertyValue('--vscode-list-invalidItemForeground').trim();
export const listWarningForeground = computedStyle.getPropertyValue('--vscode-list-warningForeground').trim();
export const listFilterWidgetBackground = computedStyle.getPropertyValue('--vscode-listFilterWidget-background').trim();
export const listFilterWidgetNoMatchesOutline = computedStyle
    .getPropertyValue('--vscode-listFilterWidget-noMatchesOutline')
    .trim();
export const listFilterWidgetOutline = computedStyle.getPropertyValue('--vscode-listFilterWidget-outline').trim();
export const menuBackground = computedStyle.getPropertyValue('--vscode-menu-background').trim();
export const menuForeground = computedStyle.getPropertyValue('--vscode-menu-foreground').trim();
export const menuSelectionBackground = computedStyle.getPropertyValue('--vscode-menu-selectionBackground').trim();
export const menuSelectionForeground = computedStyle.getPropertyValue('--vscode-menu-selectionForeground').trim();
export const menuSeparatorBackground = computedStyle.getPropertyValue('--vscode-menu-separatorBackground').trim();
export const menubarSelectionBackground = computedStyle.getPropertyValue('--vscode-menubar-selectionBackground').trim();
export const menubarSelectionForeground = computedStyle.getPropertyValue('--vscode-menubar-selectionForeground').trim();
export const mergeCommonContentBackground = computedStyle
    .getPropertyValue('--vscode-merge-commonContentBackground')
    .trim();
export const mergeCommonHeaderBackground = computedStyle
    .getPropertyValue('--vscode-merge-commonHeaderBackground')
    .trim();
export const mergeCurrentContentBackground = computedStyle
    .getPropertyValue('--vscode-merge-currentContentBackground')
    .trim();
export const mergeCurrentHeaderBackground = computedStyle
    .getPropertyValue('--vscode-merge-currentHeaderBackground')
    .trim();
export const mergeIncomingContentBackground = computedStyle
    .getPropertyValue('--vscode-merge-incomingContentBackground')
    .trim();
export const mergeIncomingHeaderBackground = computedStyle
    .getPropertyValue('--vscode-merge-incomingHeaderBackground')
    .trim();
export const notificationCenterHeaderBackground = computedStyle
    .getPropertyValue('--vscode-notificationCenterHeader-background')
    .trim();
export const notificationLinkForeground = computedStyle.getPropertyValue('--vscode-notificationLink-foreground').trim();
export const notificationsBackground = computedStyle.getPropertyValue('--vscode-notifications-background').trim();
export const notificationsBorder = computedStyle.getPropertyValue('--vscode-notifications-border').trim();
export const panelBackground = computedStyle.getPropertyValue('--vscode-panel-background').trim();
export const panelBorder = computedStyle.getPropertyValue('--vscode-panel-border').trim();
export const panelDropBackground = computedStyle.getPropertyValue('--vscode-panel-dropBackground').trim();
export const panelInputBorder = computedStyle.getPropertyValue('--vscode-panelInput-border').trim();
export const panelTitleActiveBorder = computedStyle.getPropertyValue('--vscode-panelTitle-activeBorder').trim();
export const panelTitleActiveForeground = computedStyle.getPropertyValue('--vscode-panelTitle-activeForeground').trim();
export const panelTitleInactiveForeground = computedStyle
    .getPropertyValue('--vscode-panelTitle-inactiveForeground')
    .trim();
export const peekViewBorder = computedStyle.getPropertyValue('--vscode-peekView-border').trim();
export const peekViewEditorBackground = computedStyle.getPropertyValue('--vscode-peekViewEditor-background').trim();
export const peekViewEditorMatchHighlightBackground = computedStyle
    .getPropertyValue('--vscode-peekViewEditor-matchHighlightBackground')
    .trim();
export const peekViewEditorGutterBackground = computedStyle
    .getPropertyValue('--vscode-peekViewEditorGutter-background')
    .trim();
export const peekViewResultBackground = computedStyle.getPropertyValue('--vscode-peekViewResult-background').trim();
export const peekViewResultFileForeground = computedStyle
    .getPropertyValue('--vscode-peekViewResult-fileForeground')
    .trim();
export const peekViewResultLineForeground = computedStyle
    .getPropertyValue('--vscode-peekViewResult-lineForeground')
    .trim();
export const peekViewResultMatchHighlightBackground = computedStyle
    .getPropertyValue('--vscode-peekViewResult-matchHighlightBackground')
    .trim();
export const peekViewResultSelectionBackground = computedStyle
    .getPropertyValue('--vscode-peekViewResult-selectionBackground')
    .trim();
export const peekViewResultSelectionForeground = computedStyle
    .getPropertyValue('--vscode-peekViewResult-selectionForeground')
    .trim();
export const peekViewTitleBackground = computedStyle.getPropertyValue('--vscode-peekViewTitle-background').trim();
export const peekViewTitleDescriptionForeground = computedStyle
    .getPropertyValue('--vscode-peekViewTitleDescription-foreground')
    .trim();
export const peekViewTitleLabelForeground = computedStyle
    .getPropertyValue('--vscode-peekViewTitleLabel-foreground')
    .trim();
export const pickerGroupBorder = computedStyle.getPropertyValue('--vscode-pickerGroup-border').trim();
export const pickerGroupForeground = computedStyle.getPropertyValue('--vscode-pickerGroup-foreground').trim();
export const progressBarBackground = computedStyle.getPropertyValue('--vscode-progressBar-background').trim();
export const quickInputBackground = computedStyle.getPropertyValue('--vscode-quickInput-background').trim();
export const scrollbarShadow = computedStyle.getPropertyValue('--vscode-scrollbar-shadow').trim();
export const scrollbarSliderActiveBackground = computedStyle
    .getPropertyValue('--vscode-scrollbarSlider-activeBackground')
    .trim();
export const scrollbarSliderBackground = computedStyle.getPropertyValue('--vscode-scrollbarSlider-background').trim();
export const scrollbarSliderHoverBackground = computedStyle
    .getPropertyValue('--vscode-scrollbarSlider-hoverBackground')
    .trim();
export const settingsCheckboxBackground = computedStyle.getPropertyValue('--vscode-settings-checkboxBackground').trim();
export const settingsCheckboxBorder = computedStyle.getPropertyValue('--vscode-settings-checkboxBorder').trim();
export const settingsDropdownBackground = computedStyle.getPropertyValue('--vscode-settings-dropdownBackground').trim();
export const settingsDropdownBorder = computedStyle.getPropertyValue('--vscode-settings-dropdownBorder').trim();
export const settingsDropdownListBorder = computedStyle.getPropertyValue('--vscode-settings-dropdownListBorder').trim();
export const settingsHeaderForeground = computedStyle.getPropertyValue('--vscode-settings-headerForeground').trim();
export const settingsModifiedItemIndicator = computedStyle
    .getPropertyValue('--vscode-settings-modifiedItemIndicator')
    .trim();
export const settingsNumberInputBackground = computedStyle
    .getPropertyValue('--vscode-settings-numberInputBackground')
    .trim();
export const settingsNumberInputBorder = computedStyle.getPropertyValue('--vscode-settings-numberInputBorder').trim();
export const settingsNumberInputForeground = computedStyle
    .getPropertyValue('--vscode-settings-numberInputForeground')
    .trim();
export const settingsTextInputBackground = computedStyle
    .getPropertyValue('--vscode-settings-textInputBackground')
    .trim();
export const settingsTextInputBorder = computedStyle.getPropertyValue('--vscode-settings-textInputBorder').trim();
export const settingsTextInputForeground = computedStyle
    .getPropertyValue('--vscode-settings-textInputForeground')
    .trim();
export const sideBarBackground = computedStyle.getPropertyValue('--vscode-sideBar-background').trim();
export const sideBarDropBackground = computedStyle.getPropertyValue('--vscode-sideBar-dropBackground').trim();
export const sideBarSectionHeaderBackground = computedStyle
    .getPropertyValue('--vscode-sideBarSectionHeader-background')
    .trim();
export const sideBarTitleForeground = computedStyle.getPropertyValue('--vscode-sideBarTitle-foreground').trim();
export const statusBarBackground = computedStyle.getPropertyValue('--vscode-statusBar-background').trim();
export const statusBarDebuggingBackground = computedStyle
    .getPropertyValue('--vscode-statusBar-debuggingBackground')
    .trim();
export const statusBarDebuggingForeground = computedStyle
    .getPropertyValue('--vscode-statusBar-debuggingForeground')
    .trim();
export const statusBarForeground = computedStyle.getPropertyValue('--vscode-statusBar-foreground').trim();
export const statusBarNoFolderBackground = computedStyle
    .getPropertyValue('--vscode-statusBar-noFolderBackground')
    .trim();
export const statusBarNoFolderForeground = computedStyle
    .getPropertyValue('--vscode-statusBar-noFolderForeground')
    .trim();
export const statusBarItemActiveBackground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-activeBackground')
    .trim();
export const statusBarItemHoverBackground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-hoverBackground')
    .trim();
export const statusBarItemProminentBackground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-prominentBackground')
    .trim();
export const statusBarItemProminentForeground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-prominentForeground')
    .trim();
export const statusBarItemProminentHoverBackground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-prominentHoverBackground')
    .trim();
export const statusBarItemRemoteBackground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-remoteBackground')
    .trim();
export const statusBarItemRemoteForeground = computedStyle
    .getPropertyValue('--vscode-statusBarItem-remoteForeground')
    .trim();
export const tabActiveBackground = computedStyle.getPropertyValue('--vscode-tab-activeBackground').trim();
export const tabActiveForeground = computedStyle.getPropertyValue('--vscode-tab-activeForeground').trim();
export const tabActiveModifiedBorder = computedStyle.getPropertyValue('--vscode-tab-activeModifiedBorder').trim();
export const tabBorder = computedStyle.getPropertyValue('--vscode-tab-border').trim();
export const tabInactiveBackground = computedStyle.getPropertyValue('--vscode-tab-inactiveBackground').trim();
export const tabInactiveForeground = computedStyle.getPropertyValue('--vscode-tab-inactiveForeground').trim();
export const tabInactiveModifiedBorder = computedStyle.getPropertyValue('--vscode-tab-inactiveModifiedBorder').trim();
export const tabUnfocusedActiveBackground = computedStyle
    .getPropertyValue('--vscode-tab-unfocusedActiveBackground')
    .trim();
export const tabUnfocusedActiveForeground = computedStyle
    .getPropertyValue('--vscode-tab-unfocusedActiveForeground')
    .trim();
export const tabUnfocusedActiveModifiedBorder = computedStyle
    .getPropertyValue('--vscode-tab-unfocusedActiveModifiedBorder')
    .trim();
export const tabUnfocusedInactiveForeground = computedStyle
    .getPropertyValue('--vscode-tab-unfocusedInactiveForeground')
    .trim();
export const tabUnfocusedInactiveModifiedBorder = computedStyle
    .getPropertyValue('--vscode-tab-unfocusedInactiveModifiedBorder')
    .trim();
export const terminalAnsiBlack = computedStyle.getPropertyValue('--vscode-terminal-ansiBlack').trim();
export const terminalAnsiBlue = computedStyle.getPropertyValue('--vscode-terminal-ansiBlue').trim();
export const terminalAnsiBrightBlack = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlack').trim();
export const terminalAnsiBrightBlue = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlue').trim();
export const terminalAnsiBrightCyan = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightCyan').trim();
export const terminalAnsiBrightGreen = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightGreen').trim();
export const terminalAnsiBrightMagenta = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightMagenta').trim();
export const terminalAnsiBrightRed = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightRed').trim();
export const terminalAnsiBrightWhite = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightWhite').trim();
export const terminalAnsiBrightYellow = computedStyle.getPropertyValue('--vscode-terminal-ansiBrightYellow').trim();
export const terminalAnsiCyan = computedStyle.getPropertyValue('--vscode-terminal-ansiCyan').trim();
export const terminalAnsiGreen = computedStyle.getPropertyValue('--vscode-terminal-ansiGreen').trim();
export const terminalAnsiMagenta = computedStyle.getPropertyValue('--vscode-terminal-ansiMagenta').trim();
export const terminalAnsiRed = computedStyle.getPropertyValue('--vscode-terminal-ansiRed').trim();
export const terminalAnsiWhite = computedStyle.getPropertyValue('--vscode-terminal-ansiWhite').trim();
export const terminalAnsiYellow = computedStyle.getPropertyValue('--vscode-terminal-ansiYellow').trim();
export const terminalBackground = computedStyle.getPropertyValue('--vscode-terminal-background').trim();
export const terminalBorder = computedStyle.getPropertyValue('--vscode-terminal-border').trim();
export const terminalForeground = computedStyle.getPropertyValue('--vscode-terminal-foreground').trim();
export const terminalSelectionBackground = computedStyle
    .getPropertyValue('--vscode-terminal-selectionBackground')
    .trim();
export const textBlockQuoteBackground = computedStyle.getPropertyValue('--vscode-textBlockQuote-background').trim();
export const textBlockQuoteBorder = computedStyle.getPropertyValue('--vscode-textBlockQuote-border').trim();
export const textCodeBlockBackground = computedStyle.getPropertyValue('--vscode-textCodeBlock-background').trim();
export const textLinkActiveForeground = computedStyle.getPropertyValue('--vscode-textLink-activeForeground').trim();
export const textLinkForeground = computedStyle.getPropertyValue('--vscode-textLink-foreground').trim();
export const textPreformatForeground = computedStyle.getPropertyValue('--vscode-textPreformat-foreground').trim();
export const textSeparatorForeground = computedStyle.getPropertyValue('--vscode-textSeparator-foreground').trim();
export const titleBarActiveBackground = computedStyle.getPropertyValue('--vscode-titleBar-activeBackground').trim();
export const titleBarActiveForeground = computedStyle.getPropertyValue('--vscode-titleBar-activeForeground').trim();
export const titleBarInactiveBackground = computedStyle.getPropertyValue('--vscode-titleBar-inactiveBackground').trim();
export const titleBarInactiveForeground = computedStyle.getPropertyValue('--vscode-titleBar-inactiveForeground').trim();
export const treeIndentGuidesStroke = computedStyle.getPropertyValue('--vscode-tree-indentGuidesStroke').trim();
export const widgetShadow = computedStyle.getPropertyValue('--vscode-widget-shadow').trim();
export const editorLineHighlightBackground = computedStyle
    .getPropertyValue('--vscode-editor-lineHighlightBackground')
    .trim();
export const selectionBackground = computedStyle.getPropertyValue('--vscode-selection-background').trim();
export const walkThroughEmbeddedEditorBackground = computedStyle
    .getPropertyValue('--vscode-walkThrough-embeddedEditorBackground')
    .trim();
export const dropdownForeground = computedStyle.getPropertyValue('--vscode-dropdown-foreground').trim();
export const settingsCheckboxForeground = computedStyle.getPropertyValue('--vscode-settings-checkboxForeground').trim();
export const settingsDropdownForeground = computedStyle.getPropertyValue('--vscode-settings-dropdownForeground').trim();
