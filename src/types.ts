import {CSSProperties} from "react";

export type Hyperlink = {
    key: string;
    text: string;
}

export type SpanAnnotation = {
    id?: string;
    label?: string;
    style?: string;
    selected?: boolean;
    highlighted?: boolean;
}


export type TextRange = {
    begin: number;
    end: number;
};

export type SpanData = {
    mouseSelected: boolean;
} & TextRange & SpanAnnotation;

export type TokenAnnotation = {
    depth: number;
    zIndex: number;
    openleft: boolean;
    openright: boolean;
    isFirstTokenOfSpan: boolean;
    mouseSelected: boolean;
} & SpanAnnotation;

export type TokenData = {
    text: string;
    isFirstTokenOfChunk: boolean,
    isLastTokenOfChunk: boolean,
    key: string;
    token_annotations: TokenAnnotation[],
} & TextRange;

export type QuickStyle = {
    backgroundColor: string;
    borderColor: string
    autoNestingLayout: boolean;
    labelPosition: string;
    shape: string,
} & CSSProperties;

export type TextData = {
    text: string;
    spans: SpanData[];
    mouse_selection: TextRange[];
    styles: { [style_name: string]: QuickStyle };
}


export type ColumnData = {
    key: string;
    name: string;
    type: string;
    mutable: boolean;
    filterable: boolean;
};

export type RowData = {
    [other: string]: any;
};

export type Filters = {
    [key: string]: any;
};

export type ButtonData = {
    type?: string;
    label: string;
    secondary?: string;
    color?: string;
    onMouseDown: (event: React.MouseEvent<HTMLSpanElement>) => void;
};

export type ToolbarData = {
    buttons: ButtonData[],
}

export type TableData = {
    rows: RowData[];
    rowKey: string;
    selectedRows: string[];
    highlightedRows: string[];
    columns: ColumnData[];
    suggestions?: (Hyperlink | string)[],
    filters: Filters;
    inputValue: any;
    selectedPosition: {row_id: string, col: string, mode: "EDIT" | "SELECT"};
}

export type TableMethods = {
    registerActions: ({
        scroll_to_row,
        focus,
    }: {
        scroll_to_row: (number) => void,
        focus: () => void,
    }) => void;
    onSelectedPositionChange?: (row_id: string, name: string, mode: string, cause: string) => void;
    onSelectedRowsChange?: (row_ids: string[]) => void;
    onFiltersChange?: (name: string, value: any) => void;
    onClickCellContent?: (row_id: string, name: string, value?: any) => void;
    onKeyPress?: () => void;
    onMouseEnterRow?: (row_id: any, mod_keys: string[]) => void;
    onMouseLeaveRow?: (row_id: any, mod_keys: string[]) => void;
    onCellChange?: (row_id: any, name: string, value: any) => void;
    onInputChange: (row_id: any, name: string, value: any, cause: string) => void;
}

export type TextMethods = {
    registerActions: ({
                          scroll_to_line,
                          scroll_to_span,
                          clear_current_mouse_selection,
                      }: {
        scroll_to_line: (number) => void,
        scroll_to_span: () => void,
        clear_current_mouse_selection: () => void,
    }) => void;

    onKeyPress?: (key: string, modkeys: string[], ranges: TextRange[]) => void;
    onClickSpan?: (span_id: any, modkeys: string[]) => void;
    onMouseEnterSpan?: (span_id: any, modkeys: string[]) => void;
    onMouseLeaveSpan?: (span_id: any, modkeys: string[]) => void;
    onMouseSelect?: (modkeys: string[], ranges: TextRange[]) => void
}

export type ToolbarMethods = {
    onButtonPress?: (idx: number, ranges?: TextRange[]) => void;
}
