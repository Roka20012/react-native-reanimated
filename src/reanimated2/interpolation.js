import { Extrapolate } from '../derived/interpolate';

function getVal(config) {
  'worklet';

  const { type, coef, val, ll, rr, x } = config;

  switch (type) {
    case Extrapolate.IDENTITY:
      return x;
    case Extrapolate.CLAMP:
      if (coef * val < coef * ll) {
        return ll;
      }
      return rr;
    case Extrapolate.EXTEND:
    default:
      return val;
  }
}

function isExtrapolate(value) {
  'worklet';

  return (
    value === Extrapolate.EXTEND ||
    value === Extrapolate.CLAMP ||
    value === Extrapolate.IDENTITY
  );
}

function validateType(type) {
  'worklet';

  if (!type && type !== undefined) {
    throw new Error(
      `Reanimated: config object is not valid please provide valid config, for example:
       interpolate(value, [inputRange], [outputRange], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      }) or interpolate(value, [inputRange], [outputRange], 'clamp')`
    );
  }

  const hasExtrapolateLeft = Object.prototype.hasOwnProperty.call(
    type,
    'extrapolateLeft'
  );
  const hasExtrapolateRight = Object.prototype.hasOwnProperty.call(
    type,
    'extrapolateRight'
  );

  if (
    typeof type === 'object' &&
    ((Object.keys(type).length === 2 &&
      !(hasExtrapolateLeft && hasExtrapolateRight)) ||
      (Object.keys(type).length === 1 &&
        !(hasExtrapolateLeft || hasExtrapolateRight)) ||
      Object.keys(type).length > 2)
  ) {
    throw new Error(
      `Reanimated: config object is not valid please provide valid config, for example:
       interpolate(value, [inputRange], [outputRange], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      })`
    );
  }

  if (typeof type === 'object') {
    if (hasExtrapolateLeft && !isExtrapolate(type.extrapolateLeft)) {
      throw new Error(
        `Reanimated: not supported value for "extrapolateLeft" \nSupported values: ["extend", "clamp", "identity"]\n Valid example:
         interpolate(value, [inputRange], [outputRange], {
          extrapolateLeft: 'clamp',
        })`
      );
    }

    if (hasExtrapolateRight && !isExtrapolate(type.extrapolateRight)) {
      throw new Error(
        `Reanimated: not supported value for "extrapolateRight" \nSupported values: ["extend", "clamp", "identity"]\n Valid example:
         interpolate(value, [inputRange], [outputRange], {
          extrapolateRight: 'clamp',
        })`
      );
    }
  }

  if (typeof type === 'string' && !isExtrapolate(type)) {
    throw new Error(
      `Reanimated: not supported value for "interpolate" \nSupported values: ["extend", "clamp", "identity"]\n Valid example:
       interpolate(value, [inputRange], [outputRange], "clamp")`
    );
  }
}

// TODO: support default values in worklets:
// e.g. function interpolate(x, input, output, type = Extrapolate.CLAMP)
function internalInterpolate(x, l, r, ll, rr, type) {
  'worklet';
  if (r - l === 0) return ll;
  const progress = (x - l) / (r - l);
  const val = ll + progress * (rr - ll);
  const coef = rr >= ll ? 1 : -1;

  const config = { type, coef, val, ll, rr, x };

  validateType(type);

  if (typeof type === 'object') {
    if (coef * val < coef * ll) {
      return getVal({ ...config, type: type.extrapolateLeft });
    } else if (coef * val > coef * ll) {
      return getVal({ ...config, type: type.extrapolateRight });
    }
  }

  if (coef * val < coef * ll || coef * val > coef * rr) {
    return getVal(config);
  }

  return val;
}

export function interpolate(x, input, output, type) {
  'worklet';
  if (x && x.__nodeID) {
    throw new Error(
      'Reanimated: interpolate from V1 has been renamed to interpolateNode.'
    );
  }

  const length = input.length;
  let narrowedInput = [];
  if (x < input[0]) {
    narrowedInput = [input[0], input[1], output[0], output[1]];
  } else if (x > input[length - 1]) {
    narrowedInput = [
      input[length - 2],
      input[length - 1],
      output[length - 2],
      output[length - 1],
    ];
  } else {
    for (let i = 1; i < length; ++i) {
      if (x <= input[i]) {
        narrowedInput = [input[i - 1], input[i], output[i - 1], output[i]];
        break;
      }
    }
  }
  return internalInterpolate.apply({}, [x].concat(narrowedInput).concat(type));
}
