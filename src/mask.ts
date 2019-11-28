import {
  BaseMaskRule,
  EmptyMaskRule,
  StubMaskRule,
  MaskRule,
  extend
} from "./maskRule";

var EMPTY_CHAR = " ";
var ESCAPED_CHAR = "\\";
const BACKSPACE_KEY_CODE = 8;
const DEL_KEY_CODE = 46;

var isNumericChar = function(char) {
  return /[0-9]/.test(char);
};

var isLiteralChar = function(char) {
  var code = char.charCodeAt();
  return (64 < code && code < 91) || (96 < code && code < 123) || code > 127;
};

var isSpaceChar = function(char) {
  return char === " ";
};

interface ICaret {
  start: number;
  end: number;
}

export class Mask {
  private _maskRulesChain: BaseMaskRule;

  constructor(private inputEl: HTMLInputElement, mask: string) {
    this._maskRulesChain = this._parseMaskRule(mask);
    inputEl.addEventListener("keydown", e => this._maskKeyHandler(e));
    this._displayMaskedValue();
  }

  value: any;
  maskChar = "_";

  buildInMaskRules = {
    "0": /[0-9]/,
    "9": /[0-9\s]/,
    "#": /[-+0-9\s]/,
    L: function(char) {
      return isLiteralChar(char);
    },
    l: function(char) {
      return isLiteralChar(char) || isSpaceChar(char);
    },
    C: /\S/,
    c: /./,
    A: function(char) {
      return isLiteralChar(char) || isNumericChar(char);
    },
    a: function(char) {
      return isLiteralChar(char) || isNumericChar(char) || isSpaceChar(char);
    }
  };

  private _direction() {
    return getComputedStyle(this.inputEl, null).direction || "ltr";
  }

  isForwardDirection() {
    return this._direction() === "ltr";
  }

  _getMaskRule(maskChar) {
    var ruleConfig;

    Object.keys(this.buildInMaskRules).forEach(rulePattern => {
      var allowedChars = this.buildInMaskRules[rulePattern];
      if (rulePattern === maskChar) {
        ruleConfig = {
          pattern: rulePattern,
          allowedChars: allowedChars
        };
        return false;
      }
    });

    return ruleConfig !== undefined
      ? new MaskRule(extend({ maskChar: maskChar }, ruleConfig))
      : new StubMaskRule({ maskChar: maskChar });
  }

  _parseMaskRule(mask, index?: number): BaseMaskRule {
    index = index || 0;
    if (index >= mask.length) {
      return new EmptyMaskRule();
    }

    var currentMaskChar = mask[index];
    var isEscapedChar = currentMaskChar === ESCAPED_CHAR ? 1 : 0;
    var result: BaseMaskRule = isEscapedChar
      ? new StubMaskRule({ maskChar: mask[index + 1] })
      : this._getMaskRule(currentMaskChar);

    result.next(this._parseMaskRule(mask, index + 1 + isEscapedChar));
    return result;
  }

  _displayMaskedValue(caret?: ICaret) {
    caret = caret || this._caret();
    var text = this._maskRulesChain.text();
    this.inputEl.value = text;
    this._caret(caret);
  }

  _caret(position?: ICaret): any {
    if (!position) {
      return {
        start: this.inputEl.selectionStart,
        end: this.inputEl.selectionEnd
      };
    }
    this.inputEl.setSelectionRange(position.start, position.end);
  }

  _handleKeyChain(chars: any) {
    var caret = this._caret();
    var start = this.isForwardDirection() ? caret.start : caret.start - 1;
    var end = this.isForwardDirection() ? caret.end : caret.end - 1;
    var length = start === end ? 1 : end - start;

    return this._handleChain({ text: chars, start: start, length: length });
  }

  // _value: any;
  // _textValue: string;

  _normalizeChainArguments(args: any) {
    args = args || {};
    args.index = 0;
    args.fullText = this._maskRulesChain.text();
    return args;
  }

  _handleChain(args: any) {
    var handledCount = this._maskRulesChain.handle(
      this._normalizeChainArguments(args)
    );
    // this._value = this._maskRulesChain.value();
    // this._textValue = this._maskRulesChain.text();
    return handledCount;
  }

  // function _renderMaskedValue() {
  //     if(!this._maskRulesChain) {
  //         return;
  //     }

  //     var value = this.option("value") || "";
  //     this._maskRulesChain.clear(this._normalizeChainArguments());

  //     var chainArgs = { length: value.length };
  //     chainArgs[this._isMaskedValueMode() ? "text" : "value"] = value;

  //     this._handleChain(chainArgs);
  //     this._displayMask();
  // }

  private _movementKeyCodes = [35, 36, 37, 38, 39, 40];

  private _getEmptySequence(len) {
    var res = EMPTY_CHAR;
    for (var i = 1; i < len; i++, res += EMPTY_CHAR);
    return res;
  }

  _maskKeyHandler(e: KeyboardEvent) {
    if (this._movementKeyCodes.indexOf(e.keyCode) !== -1) {
      return;
    }

    debugger;
    e.preventDefault();

    if (e.keyCode === BACKSPACE_KEY_CODE) {
      const { start, end } = this._caret();
      this._caret({ start: start - 1, end: end - 1 });
      if (this._caret().start < start) {
        this._handleKeyChain(this._getEmptySequence(end - start + 1));
        this._displayMaskedValue({ start: start - 1, end: start - 1 });
      }
      return;
    }
    if (e.keyCode === DEL_KEY_CODE) {
      const { start, end } = this._caret();
      this._handleKeyChain(this._getEmptySequence(end - start + 1));
      this._displayMaskedValue();
      return;
    }

    const previousText = this.value;
    const raiseInputEvent = () => {
      if (previousText !== this.value) {
        // this._maskStrategy.runWithoutEventProcessing(
        //     () => eventsEngine.trigger(this._input(), "input")
        // );
      }
    };

    const handled = this._handleKeyChain(e.key);

    if (handled > 0) {
      var caret = this._caret();
      caret.start += handled;
      if (caret.start > caret.end) {
        caret.end = caret.start;
      }
      this._displayMaskedValue(caret);
      raiseInputEvent();
    } else {
      raiseInputEvent();
    }
  }
}
