define(function() {
  function optionalArgument(argumentName, specifiedArg, defaultArg) {
    if (defaultArg === undefined) {
      throw 'Optional argument not specified for: ' + argumentName;
    }

    if ( specifiedArg === undefined ) {
      return defaultArg;
    }

    return specifiedArg;
  }

  function requiredArgument(argumentName, specifiedArg) {
    if (specifiedArg === undefined) {
      throw 'Argument is not optional: ' + argumentName;
    }

    return specifiedArg;
  }

  function initMouseEvent(e, options) {
    e.initMouseEvent(requiredArgument('type',           options.type                ),
                     optionalArgument('canBubble',      options.canBubble,      true),
                     optionalArgument('cancelable',     options.cancelable,     true),
                     requiredArgument('view',           window                      ),
                     optionalArgument('detail',         options.detail,         null),
                     optionalArgument('screenX',        options.screenX,        0),
                     optionalArgument('screenY',        options.screenY,        0),
                     optionalArgument('clientX',        options.clientX,        0),
                     optionalArgument('clientY',        options.clientY,        0),
                     optionalArgument('ctrlKey',        options.ctrlKey,        false),
                     optionalArgument('altKey',         options.altKey,         false),
                     optionalArgument('shiftKey',       options.shiftKey,       false),
                     optionalArgument('metaKey',        options.metaKey,        false),
                     optionalArgument('button',         options.button,         0),
                     optionalArgument('relatedTarget',  options.relatedTarget,  null));
  }

  return {
    initMouseEvent: initMouseEvent
  };
});
