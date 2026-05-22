import { syntaxTree } from "@codemirror/language";
import {
  Annotation,
  ChangeSpec,
  EditorState,
  Transaction,
  TransactionSpec
} from "@codemirror/state";
import { SyntaxNodeRef } from "@lezer/common";

export interface TransactionRange {
  from: number;
  to: number;
}

export interface ObsidianMark {
  mark: string;
  formatting: string;
  formatChar: string;
  altFormatting?: string;
}

export const oMarks: ObsidianMark[] = [
  {
    mark: "em",
    formatting: "formatting-em",
    altFormatting: "em_formatting_formatting-strong",
    formatChar: "*"
  },
  {
    mark: "strong",
    formatting: "formatting-strong",
    formatChar: "**"
  },
  {
    mark: "strikethrough",
    formatting: "formatting-strikethrough",
    formatChar: "~~"
  },
  {
    mark: "inline-code",
    formatting: "formatting-code",
    formatChar: "`"
  }
];

export const toggleMark = Annotation.define<string>();

const iterateTreeAtPos = (
  pos: number,
  state: EditorState,
  iterateFns: {
    enter(node: SyntaxNodeRef): boolean | void;
    leave?(node: SyntaxNodeRef): void;
  }
) => {
  syntaxTree(state).iterate({ ...iterateFns, from: pos, to: pos });
};

const iterateTreeInSelection = (
  selection: TransactionRange,
  state: EditorState,
  iterateFns: {
    enter(node: SyntaxNodeRef): boolean | void;
    leave?(node: SyntaxNodeRef): void;
  }
) => {
  syntaxTree(state).iterate({
    ...iterateFns,
    from: selection.from,
    to: selection.to
  });
};

const trimSpace = (pos: number, moveDirLeft: boolean, state: EditorState) => {
  if (moveDirLeft && state.sliceDoc(pos, pos + 1) === " ") return pos + 1;
  if (!moveDirLeft && state.sliceDoc(pos - 1, pos) === " ") return pos - 1;
  return pos;
};

const newPosAfterFormatting = (
  pos: number,
  moveDirLeft: boolean,
  state: EditorState
) => {
  const line = state.doc.lineAt(pos);
  const start = moveDirLeft ? line.from : pos;
  const end = moveDirLeft ? pos : line.to;
  let newPos = start;
  let lastFormatPos = start;
  const exitFormatRange = false;

  iterateTreeInSelection({ from: start, to: end }, state, {
    enter: (node) => {
      if (exitFormatRange) return false;
      if (node.name.includes("formatting")) {
        if (!moveDirLeft && node.from > start) {
          return false;
        }
        if (moveDirLeft) {
          newPos = node.from;
          lastFormatPos = node.to;
        } else {
          newPos = node.to;
        }
      }
    }
  });

  if (moveDirLeft && lastFormatPos < pos) {
    newPos = pos;
  }

  return newPos;
};

export const expandRange = (
  selection: TransactionRange,
  state: EditorState
): TransactionRange => {
  const from = trimSpace(
    newPosAfterFormatting(selection.from, true, state),
    true,
    state
  );
  const to = trimSpace(
    newPosAfterFormatting(selection.to, false, state),
    false,
    state
  );
  return { from, to };
};

export const addMarkAtPos = (
  pos: number,
  mark: ObsidianMark
): TransactionSpec => ({
  changes: { from: pos, to: pos, insert: mark.formatChar }
});

const nodeNameContainsMark = (name: string, markString: string) => {
  return name.includes(markString);
};

const posIsMark = (
  pos: number,
  state: EditorState,
  markString: string
): boolean => {
  let isMark = false;
  iterateTreeAtPos(pos, state, {
    enter: ({ name }) => {
      if (nodeNameContainsMark(name, markString)) isMark = true;
    }
  });
  return isMark;
};

export const rangeIsMark = (
  state: EditorState,
  mark: ObsidianMark,
  selection: TransactionRange
): boolean =>
  posIsMark(selection.from, state, mark.mark) &&
  posIsMark(selection.to, state, mark.mark);

export const edgeIsMark = (
  pos: number,
  state: EditorState,
  mark: ObsidianMark
) => posIsMark(pos, state, mark.mark);

export const edgeIsMarkFormat = (
  pos: number,
  state: EditorState,
  mark: ObsidianMark
) =>
  posIsMark(pos, state, mark.formatting)
    ? true
    : mark.altFormatting
    ? posIsMark(pos, state, mark.altFormatting)
    : false;

export const transactionChangesForMark = (
  range: TransactionRange,
  mark: ObsidianMark,
  state: EditorState
) => {
  const newTrans: TransactionSpec[] = [];

  if (rangeIsMark(state, mark, range)) {
    if (
      edgeIsMarkFormat(range.from, state, mark) &&
      !edgeIsMarkFormat(range.to, state, mark)
    ) {
      newTrans.push(addMarkAtPos(range.to, mark));
    }
    if (
      edgeIsMarkFormat(range.to, state, mark) &&
      !edgeIsMarkFormat(range.from, state, mark)
    ) {
      newTrans.push(addMarkAtPos(range.from, mark));
    }
  } else if (edgeIsMark(range.from, state, mark)) {
    if (
      edgeIsMarkFormat(range.from, state, mark) &&
      !edgeIsMark(range.from - 1, state, mark)
    ) {
      newTrans.push(addMarkAtPos(range.from, mark));
    }
    newTrans.push(addMarkAtPos(range.to, mark));
  } else if (edgeIsMark(range.to, state, mark)) {
    if (
      edgeIsMarkFormat(range.to, state, mark) &&
      !edgeIsMark(range.to + 1, state, mark)
    ) {
      newTrans.push(addMarkAtPos(range.to, mark));
    }
    newTrans.push(addMarkAtPos(range.from, mark));
  } else {
    newTrans.push(addMarkAtPos(range.to, mark));
    newTrans.push(addMarkAtPos(range.from, mark));
  }

  return newTrans;
};

const removeAllInternalMarks = (
  sel: TransactionRange,
  state: EditorState,
  mark: ObsidianMark
): TransactionSpec => {
  const returnTrans: ChangeSpec[] = [];

  iterateTreeInSelection({ from: sel.from, to: sel.to }, state, {
    enter: ({ name, from }) => {
      if (
        nodeNameContainsMark(name, mark.formatting) ||
        (mark.altFormatting
          ? nodeNameContainsMark(name, mark.altFormatting)
          : false)
      ) {
        returnTrans.push({
          from,
          to: from + mark.formatChar.length
        });
      }
    }
  });

  return {
    changes: returnTrans
  };
};

export const toggleMarkExtension = EditorState.transactionFilter.of(
  (tr: Transaction) => {
    const markToggle = tr.annotation(toggleMark);
    if (!markToggle) return tr;

    const mark = oMarks.find((item) => item.mark === markToggle);
    if (!mark) return tr;

    const selection = tr.startState.selection.main;
    const newTrans: TransactionSpec[] = [];

    if (selection.head === selection.anchor) {
      if (
        tr.startState.sliceDoc(
          selection.head - mark.formatChar.length,
          selection.head
        ) === mark.formatChar &&
        tr.startState.sliceDoc(
          selection.head,
          selection.head + mark.formatChar.length
        ) === mark.formatChar
      ) {
        newTrans.push({
          changes: {
            from: selection.head - mark.formatChar.length,
            to: selection.head + mark.formatChar.length
          }
        });
      } else {
        newTrans.push({
          changes: {
            from: selection.head,
            insert: mark.formatChar + mark.formatChar
          },
          selection: {
            anchor: selection.head + mark.formatChar.length,
            head: selection.head + mark.formatChar.length
          }
        });
      }
      return [tr, ...newTrans];
    }

    const range = expandRange(selection, tr.startState);
    newTrans.push(removeAllInternalMarks(range, tr.startState, mark));
    const newFrom = range.from;
    const newTo = range.to;

    newTrans.push(...transactionChangesForMark(range, mark, tr.startState));
    return [tr, ...newTrans, { selection: { anchor: newFrom, head: newTo } }];
  }
);
