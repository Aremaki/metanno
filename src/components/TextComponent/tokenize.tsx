import {CSSProperties} from "react";

import {SpanData, TokenAnnotation, TokenData} from '../../types';

type TextChunk = {
    begin: number;
    end: number;
    label: string;
    token_annotations: TokenAnnotation[];
    tokens: string[];
}

export interface PreprocessedStyle {
    base: CSSProperties;
    highlighted: CSSProperties;
    labelPosition?: string;
    autoNestingLayout: boolean;
    shape: string,
}

function chunkText(spans: SpanData[], text: string): TextChunk[] {
    // Find the minimum text split indices, ie the entities boundaries + split each new chunk into tokens
    let indices = [];
    for (let span_i = 0; span_i < spans.length; span_i++) {
        const begin = spans[span_i].begin;
        const end = spans[span_i].end;
        indices.push(begin, end);
    }
    indices.push(0, text.length);
    indices = [...new Set(indices)].sort((a, b) => a - b);
    let text_chunks: TextChunk[] = [];
    let begin, end, text_slice;
    for (let indice_i = 1; indice_i < indices.length; indice_i++) {
        begin = indices[indice_i - 1];
        end = indices[indice_i];
        text_slice = text.slice(begin, end);
        text_chunks.push({
            begin: indices[indice_i - 1],
            end: indices[indice_i],
            label: null,
            token_annotations: [],
            tokens: text_slice.length > 0
                ? text_slice
                    .match(/\n|[^ \n]+|[ ]+/g)
                    .filter(text => text.length > 0)
                : [""]
        });
    }
    return text_chunks;
}

/**
 * Compute the layout properties of each token depending on the spans that contain it
 * To compute the depth (annotation top-bottom offsets) of box and underline annotations,
 * we iterate over spans (left to right) and find out which tokens are contained within each span.
 * For each of these tokens, we take a depth that has not been assigned to another annotation
 * and propagate it to the tokens of the span.
 *
 * To obtain underline depths, we have to reverse those depths (-1, -2, ... instead of 1, 2, 3)
 * To know which value to substract (it is not just multiplying by -1), we must cluster underlined
 * tokens together and detect the biggest depth.
 *
 * @param text_chunks
 * @param spans
 * @param styles
 */
function styleTextChunks_(text_chunks: TextChunk[], spans: SpanData[], styles: { [key: string]: PreprocessedStyle }) {
    const isNot = filled => !filled;
    const underlineCluster = new Set<number>();
    let underlineClusterDepth = 0;
    let rightMostOffset = 0;

    const reverseUnderlineClusterDepths = () => {
        underlineCluster.forEach(text_chunk_i => {
            text_chunks[text_chunk_i].token_annotations.forEach(annotation => {
                if (styles?.[annotation.style]?.shape === 'underline') {
                    annotation.depth = annotation.depth - underlineClusterDepth - 1;
                }
            })
        })
    };

    spans.forEach(({begin, end, label, style, ...rest}, span_i) => {
        let newDepth = null, newZIndex = null;

        if (begin >= rightMostOffset) {
            reverseUnderlineClusterDepths();
            underlineCluster.clear();
            rightMostOffset = end;
        } else if (rightMostOffset < end) {
            rightMostOffset = end;
        }
        for (let text_chunk_i = 0; text_chunk_i < text_chunks.length; text_chunk_i++) {
            if (text_chunks[text_chunk_i].begin < end && begin < text_chunks[text_chunk_i].end) {
                underlineCluster.add(text_chunk_i);
                if (text_chunks[text_chunk_i].begin === begin) {
                    text_chunks[text_chunk_i].label = label;
                }
                if (newDepth === null && !rest.mouseSelected && styles[style]?.autoNestingLayout !== false) {
                    let missingBoxDepths = [undefined];
                    let missingUnderlineDepths = [undefined];
                    let missingZIndices = [undefined];
                    for (const {depth, zIndex, mouseSelected, style: tokenStyle} of text_chunks[text_chunk_i].token_annotations) {
                        if (!mouseSelected) {
                            (styles[tokenStyle].shape === 'underline' ? missingUnderlineDepths : missingBoxDepths)[depth] = true;
                            missingZIndices[zIndex] = true;
                        }
                    }
                    newDepth = (styles[style].shape === 'underline' ? missingUnderlineDepths : missingBoxDepths).findIndex(isNot);
                    if (newDepth === -1) {
                        newDepth = (styles[style].shape === 'underline' ? missingUnderlineDepths : missingBoxDepths).length;
                    }
                    newZIndex = missingZIndices.findIndex(isNot);
                    if (newZIndex === -1) {
                        newZIndex = missingZIndices.length;
                    }
                }
                const annotation = {
                    depth: newDepth,
                    openleft: text_chunks[text_chunk_i].begin !== begin,
                    openright: text_chunks[text_chunk_i].end !== end,
                    label: label,
                    isFirstTokenOfSpan: text_chunks[text_chunk_i].begin === begin,
                    style: style,
                    zIndex: newZIndex,
                    ...rest,
                };
                if (styles?.[style]?.shape === 'underline' && underlineClusterDepth < newDepth)
                    underlineClusterDepth = newDepth;
                text_chunks[text_chunk_i].token_annotations.unshift(annotation);
            }
        }
    });
    reverseUnderlineClusterDepths();
}

/**
 * Split text chunks into multiple lines, each composed of a subset of the total text chunks
 * @param text_chunks: text chunks obtained by the `segment` function
 */
function tokenizeTextChunks(text_chunks: TextChunk[]): TokenData[][] {
    let current_line: TokenData[] = [];
    const all_lines: TokenData[][] = [];

    let tokens = [];
    for (let i = 0; i < text_chunks.length; i++) {
        const text_chunk = text_chunks[i];
        const begin = text_chunk.begin;
        const token_annotations = text_chunk.token_annotations;
        tokens = text_chunk.tokens;

        let offset_in_text_chunk = 0;
        for (let token_i = 0; token_i < tokens.length; token_i++) {
            const span_begin = begin + offset_in_text_chunk;
            const span_end = begin + offset_in_text_chunk + tokens[token_i].length;
            if (tokens[token_i] === "\n") {
                all_lines.push(current_line)
                current_line = [];
            } else {
                current_line.push({
                    text: tokens[token_i],
                    key: `${span_begin}-${span_end}`,
                    begin: span_begin,
                    end: span_end,
                    token_annotations: token_annotations,
                    isFirstTokenOfChunk: token_i === 0,
                    isLastTokenOfChunk: token_i === tokens.length - 1,
                });
            }
            offset_in_text_chunk += tokens[token_i].length;
        }
    }
    if (current_line.length > 0 || tokens.length && tokens[tokens.length - 1] === "\n") {
        all_lines.push(current_line)
    }
    return all_lines;
}

export default function tokenize(spans: SpanData[], text: string, styles: { [key: string]: PreprocessedStyle }): {
    lines: TokenData[][];
    ids: any[];
} {
    // Sort the original spans to display
    spans = spans.sort(
        ({begin: begin_a, end: end_a, mouseSelected: mouseSelected_a}, {begin: begin_b, end: end_b, mouseSelected: mouseSelected_b}) =>
            mouseSelected_a === mouseSelected_b
                ? begin_a !== begin_b ? begin_a - begin_b : end_b - end_a
                : (mouseSelected_a ? -1 : 1)
    ).map(span => ({...span, text: text.slice(span.begin, span.end)}));

    const text_chunks = chunkText(spans, text);
    styleTextChunks_(text_chunks, spans, styles);

    const ids = spans.map(span => span.id);
    const linesOfTokens = tokenizeTextChunks(text_chunks);

    return {lines: linesOfTokens, ids: ids}; //.filter(({ token_annotations }) => token_annotations.length > 0);
}