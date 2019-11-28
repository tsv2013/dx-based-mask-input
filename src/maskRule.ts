var EMPTY_CHAR = " ";

export function extend(target, source) {
  if (typeof source === "object") {
    Object.keys(source).forEach(key => {
      target[key] = source[key];
    });
  }
  return target;
}

export class BaseMaskRule {
  _value = EMPTY_CHAR;
  maskChar: string;
  allowedChars: any;
  protected _isAccepted: any;

  constructor(config?: any) {
    extend(this, config);
  }

  _next: BaseMaskRule;

  next(rule?: BaseMaskRule): BaseMaskRule {
    if (!rule) {
      return this._next;
    }
    this._next = rule;
    return undefined;
  }

  text() {
    return "";
  }
  value() {
    return "";
  }
  rawValue() {
    return "";
  }

  handle(args: any): any {
    return 0;
  }

  _prepareHandlingArgs(args: any, config?: any) {
    config = config || {};
    var handlingProperty = Object.prototype.hasOwnProperty.call(args, "value")
      ? "value"
      : "text";
    args[handlingProperty] =
      config.str !== undefined ? config.str : args[handlingProperty];
    args.start = config.start !== undefined ? config.start : args.start;
    args.length = config.length !== undefined ? config.length : args.length;
    args.index = args.index + 1;
    return args;
  }

  reset() {}
  clear(args: any) {}

  first(index) {
    index = index || 0;
    return this.next().first(index + 1);
  }

  adjustedCaret(caret, isForwardDirection, char?) {
    return isForwardDirection
      ? this._adjustedForward(caret, 0, char)
      : this._adjustedBackward(caret, 0, char);
  }
  _adjustedForward(caret, index, char): any {
    return caret;
  }
  _adjustedBackward(caret, index, char?): any {
    return caret;
  }

  isValid(args?: any) {
    return true;
  }

  _isAllowed(char, args?): any {
    return undefined;
  }

  _accepted(value?: any): any {}

  isAccepted(caret) {
    return false;
  }
}

export class EmptyMaskRule extends BaseMaskRule {
  constructor(config?: any) {
    super(config);
  }

  next(rule?: BaseMaskRule): BaseMaskRule {
    return undefined;
  }

  first(index) {
    return 0;
  }

  adjustedCaret(caret?, isForwardDirection?, char?) {
    return 0;
  }
}

export class MaskRule extends BaseMaskRule {
  constructor(config?: any) {
    super(config);
  }

  text() {
    return (
      (this._value !== EMPTY_CHAR ? this._value : this.maskChar) +
      this.next().text()
    );
  }

  value() {
    return this._value + this.next().value();
  }

  rawValue() {
    return this._value + this.next().rawValue();
  }

  handle(args: any) {
    var str = Object.prototype.hasOwnProperty.call(args, "value")
      ? args.value
      : args.text;
    if (!str || !str.length || !args.length) {
      return 0;
    }

    if (args.start) {
      return this.next().handle(
        this._prepareHandlingArgs(args, { start: args.start - 1 })
      );
    }

    var char = str[0];
    var rest = str.substring(1);

    this._tryAcceptChar(char, args);

    return this._accepted()
      ? this.next().handle(
          this._prepareHandlingArgs(args, {
            str: rest,
            length: args.length - 1
          })
        ) + 1
      : this.handle(
          this._prepareHandlingArgs(args, {
            str: rest,
            length: args.length - 1
          })
        );
  }

  clear(args: any) {
    this._tryAcceptChar(EMPTY_CHAR, args);
    this.next().clear(this._prepareHandlingArgs(args));
  }

  reset() {
    this._accepted(false);
    this.next().reset();
  }

  _tryAcceptChar(char, args) {
    this._accepted(false);

    if (!this._isAllowed(char, args)) {
      return;
    }
    var acceptedChar = char === EMPTY_CHAR ? this.maskChar : char;
    args.fullText =
      args.fullText.substring(0, args.index) +
      acceptedChar +
      args.fullText.substring(args.index + 1);
    this._accepted(true);
    this._value = char;
  }

  _accepted(value?: any) {
    if (!arguments.length) {
      return !!this._isAccepted;
    }
    this._isAccepted = !!value;
  }

  first(index) {
    return this._value === EMPTY_CHAR ? index || 0 : super.first(index);
  }

  _isAllowed(char, args?) {
    if (char === EMPTY_CHAR) {
      return true;
    }

    return this._isValid(char, args);
  }

  _isValid(char, args) {
    var allowedChars = this.allowedChars;

    if (allowedChars instanceof RegExp) {
      return allowedChars.test(char);
    }

    if (typeof allowedChars === "function") {
      return allowedChars(char, args.index, args.fullText);
    }

    if (Array.isArray(allowedChars)) {
      return allowedChars.indexOf(char) > -1;
    }

    return allowedChars === char;
  }

  isAccepted(caret) {
    return caret === 0 ? this._accepted() : this.next().isAccepted(caret - 1);
  }

  _adjustedForward(caret, index, char): any {
    if (index >= caret) {
      return index;
    }

    return this.next()._adjustedForward(caret, index + 1, char) || index + 1;
  }

  _adjustedBackward(caret, index, char?): any {
    if (index >= caret - 1) {
      return caret;
    }

    return this.next()._adjustedBackward(caret, index + 1) || index + 1;
  }

  isValid(args) {
    return (
      this._isValid(this._value, args) &&
      this.next().isValid(this._prepareHandlingArgs(args))
    );
  }
}

export class StubMaskRule extends MaskRule {
  constructor(config?: any) {
    super(config);
  }

  value() {
    return this.next().value();
  }

  handle(args): any {
    var hasValueProperty = Object.prototype.hasOwnProperty.call(args, "value");
    var str = hasValueProperty ? args.value : args.text;
    if (!str.length || !args.length) {
      return 0;
    }

    if (args.start || hasValueProperty) {
      return this.next().handle(
        this._prepareHandlingArgs(args, { start: args.start && args.start - 1 })
      );
    }

    var char = str[0];
    var rest = str.substring(1);

    this._tryAcceptChar(char);

    var nextArgs = this._isAllowed(char)
      ? this._prepareHandlingArgs(args, { str: rest, length: args.length - 1 })
      : args;
    return this.next().handle(nextArgs) + 1;
  }

  clear(args) {
    this._accepted(false);
    this.next().clear(this._prepareHandlingArgs(args));
  }

  _tryAcceptChar(char) {
    this._accepted(this._isValid(char));
  }

  _isValid(char) {
    return char === this.maskChar;
  }

  first(index) {
    index = index || 0;
    return this.next().first(index + 1);
  }

  _adjustedForward(caret, index, char) {
    if (index >= caret && char === this.maskChar) {
      return index;
    }

    if (caret === index + 1 && this._accepted()) {
      return caret;
    }
    return this.next()._adjustedForward(caret, index + 1, char);
  }

  _adjustedBackward(caret, index, char?) {
    if (index >= caret - 1) {
      return 0;
    }

    return this.next()._adjustedBackward(caret, index + 1);
  }

  isValid(args) {
    return this.next().isValid(this._prepareHandlingArgs(args));
  }
}
