(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
const Rox = require('rox-browser');

const flags = {
  enableTutorial: new Rox.Flag(),
  titleColors: new Rox.RoxString('White', ['White', 'Blue', 'Green', 'Yellow']),
  titleSize: new Rox.RoxNumber(12, [12, 14, 18, 24])
};

async function initFeatureManagement() {
	Rox.register(flags);
	console.log('Calling setup');
	await Rox.setup('612f5d0a30c0b442ab612c3c');
	console.log('Done setup');
	console.log('flags.enableTutorial.isEnabled()=', flags.enableTutorial.isEnabled());
	console.log('flags.titleColors.getValue()=', flags.titleColors.getValue());
}

console.log('Starting app!!!');
initFeatureManagement();
console.log('Finished app!!!');
},{"rox-browser":38}],6:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":8}],7:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var cookies = require('./../helpers/cookies');
var buildURL = require('./../helpers/buildURL');
var buildFullPath = require('../core/buildFullPath');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var transitionalDefaults = require('../defaults/transitional');
var AxiosError = require('../core/AxiosError');
var CanceledError = require('../cancel/CanceledError');
var parseProtocol = require('../helpers/parseProtocol');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);

    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || transitionalDefaults;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new CanceledError() : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    var protocol = parseProtocol(fullPath);

    if (protocol && [ 'http', 'https', 'file' ].indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    }


    // Send the request
    request.send(requestData);
  });
};

},{"../cancel/CanceledError":10,"../core/AxiosError":13,"../core/buildFullPath":15,"../defaults/transitional":21,"../helpers/parseProtocol":33,"./../core/settle":18,"./../helpers/buildURL":24,"./../helpers/cookies":26,"./../helpers/isURLSameOrigin":29,"./../helpers/parseHeaders":32,"./../utils":37}],8:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.CanceledError = require('./cancel/CanceledError');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');
axios.VERSION = require('./env/data').version;
axios.toFormData = require('./helpers/toFormData');

// Expose AxiosError class
axios.AxiosError = require('../lib/core/AxiosError');

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"../lib/core/AxiosError":13,"./cancel/CancelToken":9,"./cancel/CanceledError":10,"./cancel/isCancel":11,"./core/Axios":12,"./core/mergeConfig":17,"./defaults":20,"./env/data":22,"./helpers/bind":23,"./helpers/isAxiosError":28,"./helpers/spread":34,"./helpers/toFormData":35,"./utils":37}],9:[function(require,module,exports){
'use strict';

var CanceledError = require('./CanceledError');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new CanceledError(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./CanceledError":10}],10:[function(require,module,exports){
'use strict';

var AxiosError = require('../core/AxiosError');
var utils = require('../utils');

/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function CanceledError(message) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED);
  this.name = 'CanceledError';
}

utils.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});

module.exports = CanceledError;

},{"../core/AxiosError":13,"../utils":37}],11:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],12:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var buildFullPath = require('./buildFullPath');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  var fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method: method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url: url,
        data: data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});

module.exports = Axios;

},{"../helpers/buildURL":24,"../helpers/validator":36,"./../utils":37,"./InterceptorManager":14,"./buildFullPath":15,"./dispatchRequest":16,"./mergeConfig":17}],13:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

utils.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});

var prototype = AxiosError.prototype;
var descriptors = {};

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED'
// eslint-disable-next-line func-names
].forEach(function(code) {
  descriptors[code] = {value: code};
});

Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, 'isAxiosError', {value: true});

// eslint-disable-next-line func-names
AxiosError.from = function(error, code, config, request, response, customProps) {
  var axiosError = Object.create(prototype);

  utils.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  });

  AxiosError.call(axiosError, error.message, code, config, request, response);

  axiosError.name = error.name;

  customProps && Object.assign(axiosError, customProps);

  return axiosError;
};

module.exports = AxiosError;

},{"../utils":37}],14:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":37}],15:[function(require,module,exports){
'use strict';

var isAbsoluteURL = require('../helpers/isAbsoluteURL');
var combineURLs = require('../helpers/combineURLs');

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

},{"../helpers/combineURLs":25,"../helpers/isAbsoluteURL":27}],16:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var CanceledError = require('../cancel/CanceledError');

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/CanceledError":10,"../cancel/isCancel":11,"../defaults":20,"./../utils":37,"./transformData":19}],17:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'beforeRedirect': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};

},{"../utils":37}],18:[function(require,module,exports){
'use strict';

var AxiosError = require('./AxiosError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status code ' + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
};

},{"./AxiosError":13}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var defaults = require('../defaults');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

},{"../defaults":20,"./../utils":37}],20:[function(require,module,exports){
(function (process){(function (){
'use strict';

var utils = require('../utils');
var normalizeHeaderName = require('../helpers/normalizeHeaderName');
var AxiosError = require('../core/AxiosError');
var transitionalDefaults = require('./transitional');
var toFormData = require('../helpers/toFormData');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('../adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('../adapters/http');
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: transitionalDefaults,

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }

    var isObjectPayload = utils.isObject(data);
    var contentType = headers && headers['Content-Type'];

    var isFileList;

    if ((isFileList = utils.isFileList(data)) || (isObjectPayload && contentType === 'multipart/form-data')) {
      var _FormData = this.env && this.env.FormData;
      return toFormData(isFileList ? {'files[]': data} : data, _FormData && new _FormData());
    } else if (isObjectPayload || contentType === 'application/json') {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: require('./env/FormData')
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this)}).call(this,require('_process'))
},{"../adapters/http":7,"../adapters/xhr":7,"../core/AxiosError":13,"../helpers/normalizeHeaderName":30,"../helpers/toFormData":35,"../utils":37,"./env/FormData":31,"./transitional":21,"_process":4}],21:[function(require,module,exports){
'use strict';

module.exports = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

},{}],22:[function(require,module,exports){
module.exports = {
  "version": "0.27.2"
};
},{}],23:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],24:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":37}],25:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],26:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

},{"./../utils":37}],27:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};

},{}],28:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return utils.isObject(payload) && (payload.isAxiosError === true);
};

},{"./../utils":37}],29:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

},{"./../utils":37}],30:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":37}],31:[function(require,module,exports){
// eslint-disable-next-line strict
module.exports = null;

},{}],32:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":37}],33:[function(require,module,exports){
'use strict';

module.exports = function parseProtocol(url) {
  var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
};

},{}],34:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],35:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

var utils = require('../utils');

/**
 * Convert a data object to FormData
 * @param {Object} obj
 * @param {?Object} [formData]
 * @returns {Object}
 **/

function toFormData(obj, formData) {
  // eslint-disable-next-line no-param-reassign
  formData = formData || new FormData();

  var stack = [];

  function convertValue(value) {
    if (value === null) return '';

    if (utils.isDate(value)) {
      return value.toISOString();
    }

    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
      return typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  function build(data, parentKey) {
    if (utils.isPlainObject(data) || utils.isArray(data)) {
      if (stack.indexOf(data) !== -1) {
        throw Error('Circular reference detected in ' + parentKey);
      }

      stack.push(data);

      utils.forEach(data, function each(value, key) {
        if (utils.isUndefined(value)) return;
        var fullKey = parentKey ? parentKey + '.' + key : key;
        var arr;

        if (value && !parentKey && typeof value === 'object') {
          if (utils.endsWith(key, '{}')) {
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          } else if (utils.endsWith(key, '[]') && (arr = utils.toArray(value))) {
            // eslint-disable-next-line func-names
            arr.forEach(function(el) {
              !utils.isUndefined(el) && formData.append(fullKey, convertValue(el));
            });
            return;
          }
        }

        build(value, fullKey);
      });

      stack.pop();
    } else {
      formData.append(parentKey, convertValue(data));
    }
  }

  build(obj);

  return formData;
}

module.exports = toFormData;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../utils":37,"buffer":2}],36:[function(require,module,exports){
'use strict';

var VERSION = require('../env/data').version;
var AxiosError = require('../core/AxiosError');

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new AxiosError(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};

},{"../core/AxiosError":13,"../env/data":22}],37:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

// eslint-disable-next-line func-names
var kindOf = (function(cache) {
  // eslint-disable-next-line func-names
  return function(thing) {
    var str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  };
})(Object.create(null));

function kindOfTest(type) {
  type = type.toLowerCase();
  return function isKindOf(thing) {
    return kindOf(thing) === type;
  };
}

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return Array.isArray(val);
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
var isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (kindOf(val) !== 'object') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
var isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
var isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} thing The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(thing) {
  var pattern = '[object FormData]';
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) ||
    toString.call(thing) === pattern ||
    (isFunction(thing.toString) && thing.toString() === pattern)
  );
}

/**
 * Determine if a value is a URLSearchParams object
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
var isURLSearchParams = kindOfTest('URLSearchParams');

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 */

function inherits(constructor, superConstructor, props, descriptors) {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  props && Object.assign(constructor.prototype, props);
}

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function} [filter]
 * @returns {Object}
 */

function toFlatObject(sourceObj, destObj, filter) {
  var props;
  var i;
  var prop;
  var merged = {};

  destObj = destObj || {};

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if (!merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = Object.getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
}

/*
 * determines whether a string ends with the characters of a specified string
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 * @returns {boolean}
 */
function endsWith(str, searchString, position) {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  var lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}


/**
 * Returns new array from array like object
 * @param {*} [thing]
 * @returns {Array}
 */
function toArray(thing) {
  if (!thing) return null;
  var i = thing.length;
  if (isUndefined(i)) return null;
  var arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
}

// eslint-disable-next-line func-names
var isTypedArray = (function(TypedArray) {
  // eslint-disable-next-line func-names
  return function(thing) {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM,
  inherits: inherits,
  toFlatObject: toFlatObject,
  kindOf: kindOf,
  kindOfTest: kindOfTest,
  endsWith: endsWith,
  toArray: toArray,
  isTypedArray: isTypedArray,
  isFileList: isFileList
};

},{"./helpers/bind":23}],38:[function(require,module,exports){
(function (Buffer){(function (){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("axios")):"function"==typeof define&&define.amd?define(["axios"],e):"object"==typeof exports?exports.Rox=e(require("axios")):t.Rox=e(t.axios)}(self,(function(t){return r={792:function(t){var e={utf8:{stringToBytes:function(t){return e.bin.stringToBytes(unescape(encodeURIComponent(t)))},bytesToString:function(t){return decodeURIComponent(escape(e.bin.bytesToString(t)))}},bin:{stringToBytes:function(t){for(var e=[],r=0;r<t.length;r++)e.push(255&t.charCodeAt(r));return e},bytesToString:function(t){for(var e=[],r=0;r<t.length;r++)e.push(String.fromCharCode(t[r]));return e.join("")}}};t.exports=e},562:function(t){var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",r={rotl:function(t,e){return t<<e|t>>>32-e},rotr:function(t,e){return t<<32-e|t>>>e},endian:function(t){if(t.constructor==Number)return 16711935&r.rotl(t,8)|4278255360&r.rotl(t,24);for(var e=0;e<t.length;e++)t[e]=r.endian(t[e]);return t},randomBytes:function(t){for(var e=[];0<t;t--)e.push(Math.floor(256*Math.random()));return e},bytesToWords:function(t){for(var e=[],r=0,i=0;r<t.length;r++,i+=8)e[i>>>5]|=t[r]<<24-i%32;return e},wordsToBytes:function(t){for(var e=[],r=0;r<32*t.length;r+=8)e.push(t[r>>>5]>>>24-r%32&255);return e},bytesToHex:function(t){for(var e=[],r=0;r<t.length;r++)e.push((t[r]>>>4).toString(16)),e.push((15&t[r]).toString(16));return e.join("")},hexToBytes:function(t){for(var e=[],r=0;r<t.length;r+=2)e.push(parseInt(t.substr(r,2),16));return e},bytesToBase64:function(t){for(var r=[],i=0;i<t.length;i+=3)for(var n=t[i]<<16|t[i+1]<<8|t[i+2],s=0;s<4;s++)8*i+6*s<=8*t.length?r.push(e.charAt(n>>>6*(3-s)&63)):r.push("=");return r.join("")},base64ToBytes:function(t){t=t.replace(/[^A-Z0-9+\/]/gi,"");for(var r=[],i=0,n=0;i<t.length;n=++i%4)0!=n&&r.push((e.indexOf(t.charAt(i-1))&Math.pow(2,-2*n+8)-1)<<2*n|e.indexOf(t.charAt(i))>>>6-2*n);return r}};t.exports=r},359:function(t,e){var r,i,n,s,o,a,u,c,h,l,p;function f(){}t.exports=(r=Math,i=Object.create||function(t){return f.prototype=t,t=new f,f.prototype=null,t},n=(t={}).lib={},s=n.Base={extend:function(t){var e=i(this);return t&&e.mixIn(t),e.hasOwnProperty("init")&&this.init!==e.init||(e.init=function(){e.$super.init.apply(this,arguments)}),(e.init.prototype=e).$super=this,e},create:function(){var t=this.extend();return t.init.apply(t,arguments),t},init:function(){},mixIn:function(t){for(var e in t)t.hasOwnProperty(e)&&(this[e]=t[e]);t.hasOwnProperty("toString")&&(this.toString=t.toString)},clone:function(){return this.init.prototype.extend(this)}},o=n.WordArray=s.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:4*t.length},toString:function(t){return(t||u).stringify(this)},concat:function(t){var e=this.words,r=t.words,i=this.sigBytes,n=t.sigBytes;if(this.clamp(),i%4)for(var s=0;s<n;s++){var o=r[s>>>2]>>>24-s%4*8&255;e[i+s>>>2]|=o<<24-(i+s)%4*8}else for(s=0;s<n;s+=4)e[i+s>>>2]=r[s>>>2];return this.sigBytes+=n,this},clamp:function(){var t=this.words,e=this.sigBytes;t[e>>>2]&=4294967295<<32-e%4*8,t.length=r.ceil(e/4)},clone:function(){var t=s.clone.call(this);return t.words=this.words.slice(0),t},random:function(t){for(var e=[],i=0;i<t;i+=4){var n=function(t){var e=987654321,i=4294967295;return function(){return((((e=36969*(65535&e)+(e>>16)&i)<<16)+(t=18e3*(65535&t)+(t>>16)&i)&i)/4294967296+.5)*(.5<r.random()?1:-1)}}(4294967296*(s||r.random())),s=987654071*n();e.push(4294967296*n()|0)}return new o.init(e,t)}}),a=t.enc={},u=a.Hex={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n++){var s=e[n>>>2]>>>24-n%4*8&255;i.push((s>>>4).toString(16)),i.push((15&s).toString(16))}return i.join("")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i+=2)r[i>>>3]|=parseInt(t.substr(i,2),16)<<24-i%8*4;return new o.init(r,e/2)}},c=a.Latin1={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n++){var s=e[n>>>2]>>>24-n%4*8&255;i.push(String.fromCharCode(s))}return i.join("")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i++)r[i>>>2]|=(255&t.charCodeAt(i))<<24-i%4*8;return new o.init(r,e)}},h=a.Utf8={stringify:function(t){try{return decodeURIComponent(escape(c.stringify(t)))}catch(t){throw new Error("Malformed UTF-8 data")}},parse:function(t){return c.parse(unescape(encodeURIComponent(t)))}},l=n.BufferedBlockAlgorithm=s.extend({reset:function(){this._data=new o.init,this._nDataBytes=0},_append:function(t){"string"==typeof t&&(t=h.parse(t)),this._data.concat(t),this._nDataBytes+=t.sigBytes},_process:function(t){var e=this._data,i=e.words,n=e.sigBytes,s=this.blockSize,a=n/(4*s),u=(a=t?r.ceil(a):r.max((0|a)-this._minBufferSize,0))*s;if(t=r.min(4*u,n),u){for(var c=0;c<u;c+=s)this._doProcessBlock(i,c);var h=i.splice(0,u);e.sigBytes-=t}return new o.init(h,t)},clone:function(){var t=s.clone.call(this);return t._data=this._data.clone(),t},_minBufferSize:0}),n.Hasher=l.extend({cfg:s.extend(),init:function(t){this.cfg=this.cfg.extend(t),this.reset()},reset:function(){l.reset.call(this),this._doReset()},update:function(t){return this._append(t),this._process(),this},finalize:function(t){return t&&this._append(t),this._doFinalize()},blockSize:16,_createHelper:function(t){return function(e,r){return new t.init(r).finalize(e)}},_createHmacHelper:function(t){return function(e,r){return new p.HMAC.init(t,r).finalize(e)}}}),p=t.algo={},t)},93:function(t,e,r){t.exports=function(t){var e=Math,r=t,i=(s=r.lib).WordArray,n=s.Hasher,s=r.algo,o=[],a=[];function u(t){return 4294967296*(t-(0|t))|0}for(var c=2,h=0;h<64;)!function(t){for(var r=e.sqrt(t),i=2;i<=r;i++)if(!(t%i))return;return 1}(c)||(h<8&&(o[h]=u(e.pow(c,.5))),a[h]=u(e.pow(c,1/3)),h++),c++;var l=[];return s=s.SHA256=n.extend({_doReset:function(){this._hash=new i.init(o.slice(0))},_doProcessBlock:function(t,e){for(var r=this._hash.words,i=r[0],n=r[1],s=r[2],o=r[3],u=r[4],c=r[5],h=r[6],p=r[7],f=0;f<64;f++){f<16?l[f]=0|t[e+f]:(d=l[f-15],g=l[f-2],l[f]=((d<<25|d>>>7)^(d<<14|d>>>18)^d>>>3)+l[f-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+l[f-16]);var d=i&n^i&s^n&s,g=p+((u<<26|u>>>6)^(u<<21|u>>>11)^(u<<7|u>>>25))+(u&c^~u&h)+a[f]+l[f];p=h,h=c,c=u,u=o+g|0,o=s,s=n,n=i,i=g+(((i<<30|i>>>2)^(i<<19|i>>>13)^(i<<10|i>>>22))+d)|0}r[0]=r[0]+i|0,r[1]=r[1]+n|0,r[2]=r[2]+s|0,r[3]=r[3]+o|0,r[4]=r[4]+u|0,r[5]=r[5]+c|0,r[6]=r[6]+h|0,r[7]=r[7]+p|0},_doFinalize:function(){var t=this._data,r=t.words,i=8*this._nDataBytes,n=8*t.sigBytes;return r[n>>>5]|=128<<24-n%32,r[14+(64+n>>>9<<4)]=e.floor(i/4294967296),r[15+(64+n>>>9<<4)]=i,t.sigBytes=4*r.length,this._process(),this._hash},clone:function(){var t=n.clone.call(this);return t._hash=this._hash.clone(),t}}),r.SHA256=n._createHelper(s),r.HmacSHA256=n._createHmacHelper(s),t.SHA256}(r(359))},335:function(t){function e(t){return!!t.constructor&&"function"==typeof t.constructor.isBuffer&&t.constructor.isBuffer(t)}t.exports=function(t){return null!=t&&(e(t)||"function"==typeof t.readFloatLE&&"function"==typeof t.slice&&e(t.slice(0,0))||!!t._isBuffer)}},345:function(t,e){!function(t){"use strict";function e(t){return"0123456789abcdefghijklmnopqrstuvwxyz".charAt(t)}function r(t,e){return t&e}function i(t,e){return t|e}function n(t,e){return t^e}function s(t,e){return t&~e}f.prototype.toString=function(t){if(this.s<0)return"-"+this.negate().toString(t);var r;if(16==t)r=4;else if(8==t)r=3;else if(2==t)r=1;else if(32==t)r=5;else{if(4!=t)return this.toRadix(t);r=2}var i,n=(1<<r)-1,s=!1,o="",a=this.t,u=this.DB-a*this.DB%r;if(0<a--)for(u<this.DB&&0<(i=this[a]>>u)&&(s=!0,o=e(i));0<=a;)u<r?(i=(this[a]&(1<<u)-1)<<r-u,i|=this[--a]>>(u+=this.DB-r)):(i=this[a]>>(u-=r)&n,u<=0&&(u+=this.DB,--a)),(s=0<i||s)&&(o+=e(i));return s?o:"0"},f.prototype.negate=function(){var t=d();return f.ZERO.subTo(this,t),t},f.prototype.abs=function(){return this.s<0?this.negate():this},f.prototype.compareTo=function(t){var e=this.s-t.s;if(0!=e)return e;var r=this.t;if(0!=(e=r-t.t))return this.s<0?-e:e;for(;0<=--r;)if(0!=(e=this[r]-t[r]))return e;return 0},f.prototype.bitLength=function(){return this.t<=0?0:this.DB*(this.t-1)+x(this[this.t-1]^this.s&this.DM)},f.prototype.mod=function(t){var e=d();return this.abs().divRemTo(t,null,e),this.s<0&&0<e.compareTo(f.ZERO)&&t.subTo(e,e),e},f.prototype.modPowInt=function(t,e){return e=new(t<256||e.isEven()?u:c)(e),this.exp(t,e)},f.prototype.clone=function(){var t=d();return this.copyTo(t),t},f.prototype.intValue=function(){if(this.s<0){if(1==this.t)return this[0]-this.DV;if(0==this.t)return-1}else{if(1==this.t)return this[0];if(0==this.t)return 0}return(this[1]&(1<<32-this.DB)-1)<<this.DB|this[0]},f.prototype.byteValue=function(){return 0==this.t?this.s:this[0]<<24>>24},f.prototype.shortValue=function(){return 0==this.t?this.s:this[0]<<16>>16},f.prototype.signum=function(){return this.s<0?-1:this.t<=0||1==this.t&&this[0]<=0?0:1},f.prototype.equals=function(t){return 0==this.compareTo(t)},f.prototype.min=function(t){return this.compareTo(t)<0?this:t},f.prototype.max=function(t){return 0<this.compareTo(t)?this:t},f.prototype.and=function(t){var e=d();return this.bitwiseTo(t,r,e),e},f.prototype.or=function(t){var e=d();return this.bitwiseTo(t,i,e),e},f.prototype.xor=function(t){var e=d();return this.bitwiseTo(t,n,e),e},f.prototype.shiftLeft=function(t){var e=d();return t<0?this.rShiftTo(-t,e):this.lShiftTo(t,e),e},f.prototype.bitCount=function(){for(var t=0,e=this.s&this.DM,r=0;r<this.t;++r)t+=function(t){for(var e=0;0!=t;)t&=t-1,++e;return e}(this[r]^e);return t},f.prototype.testBit=function(t){var e=Math.floor(t/this.DB);return e>=this.t?0!=this.s:0!=(this[e]&1<<t%this.DB)},f.prototype.setBit=function(t){return this.changeBit(t,i)},f.prototype.clearBit=function(t){return this.changeBit(t,s)},f.prototype.flipBit=function(t){return this.changeBit(t,n)},f.prototype.subtract=function(t){var e=d();return this.subTo(t,e),e},f.prototype.multiply=function(t){var e=d();return this.multiplyTo(t,e),e},f.prototype.divide=function(t){var e=d();return this.divRemTo(t,e,null),e},f.prototype.remainder=function(t){var e=d();return this.divRemTo(t,null,e),e},f.prototype.divideAndRemainder=function(t){var e=d(),r=d();return this.divRemTo(t,e,r),[e,r]},f.prototype.pow=function(t){return this.exp(t,new a)},f.prototype.copyTo=function(t){for(var e=this.t-1;0<=e;--e)t[e]=this[e];t.t=this.t,t.s=this.s},f.prototype.fromInt=function(t){this.t=1,this.s=t<0?-1:0,0<t?this[0]=t:t<-1?this[0]=t+this.DV:this.t=0},f.prototype.fromString=function(t,e){var r;if(16==e)r=4;else if(8==e)r=3;else if(256==e)r=8;else if(2==e)r=1;else if(32==e)r=5;else{if(4!=e)return void this.fromRadix(t,e);r=2}this.t=0,this.s=0;for(var i=t.length,n=!1,s=0;0<=--i;){var o=8==r?255&+t[i]:_(t,i);o<0?"-"==t.charAt(i)&&(n=!0):(n=!1,0==s?this[this.t++]=o:s+r>this.DB?(this[this.t-1]|=(o&(1<<this.DB-s)-1)<<s,this[this.t++]=o>>this.DB-s):this[this.t-1]|=o<<s,(s+=r)>=this.DB&&(s-=this.DB))}8==r&&0!=(128&+t[0])&&(this.s=-1,0<s&&(this[this.t-1]|=(1<<this.DB-s)-1<<s)),this.clamp(),n&&f.ZERO.subTo(this,this)},f.prototype.clamp=function(){for(var t=this.s&this.DM;0<this.t&&this[this.t-1]==t;)--this.t},f.prototype.dlShiftTo=function(t,e){for(var r=this.t-1;0<=r;--r)e[r+t]=this[r];for(r=t-1;0<=r;--r)e[r]=0;e.t=this.t+t,e.s=this.s},f.prototype.drShiftTo=function(t,e){for(var r=t;r<this.t;++r)e[r-t]=this[r];e.t=Math.max(this.t-t,0),e.s=this.s},f.prototype.lShiftTo=function(t,e){for(var r=t%this.DB,i=this.DB-r,n=(1<<i)-1,s=Math.floor(t/this.DB),o=this.s<<r&this.DM,a=this.t-1;0<=a;--a)e[a+s+1]=this[a]>>i|o,o=(this[a]&n)<<r;for(a=s-1;0<=a;--a)e[a]=0;e[s]=o,e.t=this.t+s+1,e.s=this.s,e.clamp()},f.prototype.rShiftTo=function(t,e){e.s=this.s;var r=Math.floor(t/this.DB);if(r>=this.t)e.t=0;else{var i=t%this.DB,n=this.DB-i,s=(1<<i)-1;e[0]=this[r]>>i;for(var o=r+1;o<this.t;++o)e[o-r-1]|=(this[o]&s)<<n,e[o-r]=this[o]>>i;0<i&&(e[this.t-r-1]|=(this.s&s)<<n),e.t=this.t-r,e.clamp()}},f.prototype.subTo=function(t,e){for(var r=0,i=0,n=Math.min(t.t,this.t);r<n;)i+=this[r]-t[r],e[r++]=i&this.DM,i>>=this.DB;if(t.t<this.t){for(i-=t.s;r<this.t;)i+=this[r],e[r++]=i&this.DM,i>>=this.DB;i+=this.s}else{for(i+=this.s;r<t.t;)i-=t[r],e[r++]=i&this.DM,i>>=this.DB;i-=t.s}e.s=i<0?-1:0,i<-1?e[r++]=this.DV+i:0<i&&(e[r++]=i),e.t=r,e.clamp()},f.prototype.multiplyTo=function(t,e){var r=this.abs(),i=t.abs(),n=r.t;for(e.t=n+i.t;0<=--n;)e[n]=0;for(n=0;n<i.t;++n)e[n+r.t]=r.am(0,i[n],e,n,0,r.t);e.s=0,e.clamp(),this.s!=t.s&&f.ZERO.subTo(e,e)},f.prototype.squareTo=function(t){for(var e=this.abs(),r=t.t=2*e.t;0<=--r;)t[r]=0;for(r=0;r<e.t-1;++r){var i=e.am(r,e[r],t,2*r,0,1);(t[r+e.t]+=e.am(r+1,2*e[r],t,2*r+1,i,e.t-r-1))>=e.DV&&(t[r+e.t]-=e.DV,t[r+e.t+1]=1)}0<t.t&&(t[t.t-1]+=e.am(r,e[r],t,2*r,0,1)),t.s=0,t.clamp()},f.prototype.divRemTo=function(t,e,r){if(!((c=t.abs()).t<=0)){var i=this.abs();if(i.t<c.t)return null!=e&&e.fromInt(0),void(null!=r&&this.copyTo(r));null==r&&(r=d());var n=d(),s=this.s,o=(t=t.s,this.DB-x(c[c.t-1])),a=(0<o?(c.lShiftTo(o,n),i.lShiftTo(o,r)):(c.copyTo(n),i.copyTo(r)),n.t),u=n[a-1];if(0!=u){var c=u*(1<<this.F1)+(1<a?n[a-2]>>this.F2:0),h=this.FV/c,l=(1<<this.F1)/c,p=1<<this.F2,g=r.t,m=g-a,y=null==e?d():e;for(n.dlShiftTo(m,y),0<=r.compareTo(y)&&(r[r.t++]=1,r.subTo(y,r)),f.ONE.dlShiftTo(a,y),y.subTo(n,n);n.t<a;)n[n.t++]=0;for(;0<=--m;){var v=r[--g]==u?this.DM:Math.floor(r[g]*h+(r[g-1]+p)*l);if((r[g]+=n.am(0,v,r,m,0,a))<v)for(n.dlShiftTo(m,y),r.subTo(y,r);r[g]<--v;)r.subTo(y,r)}null!=e&&(r.drShiftTo(a,e),s!=t&&f.ZERO.subTo(e,e)),r.t=a,r.clamp(),0<o&&r.rShiftTo(o,r),s<0&&f.ZERO.subTo(r,r)}}},f.prototype.invDigit=function(){if(this.t<1)return 0;var t=this[0];if(0==(1&t))return 0;var e=3&t;return 0<(e=(e=(e=(e=e*(2-(15&t)*e)&15)*(2-(255&t)*e)&255)*(2-((65535&t)*e&65535))&65535)*(2-t*e%this.DV)%this.DV)?this.DV-e:-e},f.prototype.isEven=function(){return 0==(0<this.t?1&this[0]:this.s)},f.prototype.exp=function(t,e){if(4294967295<t||t<1)return f.ONE;var r,i=d(),n=d(),s=e.convert(this),o=x(t)-1;for(s.copyTo(i);0<=--o;)e.sqrTo(i,n),0<(t&1<<o)?e.mulTo(n,s,i):(r=i,i=n,n=r);return e.revert(i)},f.prototype.chunkSize=function(t){return Math.floor(Math.LN2*this.DB/Math.log(t))},f.prototype.toRadix=function(t){if(null==t&&(t=10),0==this.signum()||t<2||36<t)return"0";var e=this.chunkSize(t),r=Math.pow(t,e),i=b(r),n=d(),s=d(),o="";for(this.divRemTo(i,n,s);0<n.signum();)o=(r+s.intValue()).toString(t).substr(1)+o,n.divRemTo(i,n,s);return s.intValue().toString(t)+o},f.prototype.fromRadix=function(t,e){this.fromInt(0);for(var r=this.chunkSize(e=null==e?10:e),i=Math.pow(e,r),n=!1,s=0,o=0,a=0;a<t.length;++a){var u=_(t,a);u<0?"-"==t.charAt(a)&&0==this.signum()&&(n=!0):(o=e*o+u,++s>=r&&(this.dMultiply(i),this.dAddOffset(o,0),o=s=0))}0<s&&(this.dMultiply(Math.pow(e,s)),this.dAddOffset(o,0)),n&&f.ZERO.subTo(this,this)},f.prototype.bitwiseTo=function(t,e,r){for(var i,n=Math.min(t.t,this.t),s=0;s<n;++s)r[s]=e(this[s],t[s]);if(t.t<this.t){for(i=t.s&this.DM,s=n;s<this.t;++s)r[s]=e(this[s],i);r.t=this.t}else{for(i=this.s&this.DM,s=n;s<t.t;++s)r[s]=e(i,t[s]);r.t=t.t}r.s=e(this.s,t.s),r.clamp()},f.prototype.changeBit=function(t,e){return t=f.ONE.shiftLeft(t),this.bitwiseTo(t,e,t),t},f.prototype.dMultiply=function(t){this[this.t]=this.am(0,t-1,this,0,0,this.t),++this.t,this.clamp()},f.prototype.dAddOffset=function(t,e){if(0!=t){for(;this.t<=e;)this[this.t++]=0;for(this[e]+=t;this[e]>=this.DV;)this[e]-=this.DV,++e>=this.t&&(this[this.t++]=0),++this[e]}},f.prototype.multiplyLowerTo=function(t,e,r){var i=Math.min(this.t+t.t,e);for(r.s=0,r.t=i;0<i;)r[--i]=0;for(var n=r.t-this.t;i<n;++i)r[i+this.t]=this.am(0,t[i],r,i,0,this.t);for(n=Math.min(t.t,e);i<n;++i)this.am(0,t[i],r,i,0,e-i);r.clamp()},f.prototype.multiplyUpperTo=function(t,e,r){var i=r.t=this.t+t.t- --e;for(r.s=0;0<=--i;)r[i]=0;for(i=Math.max(e-this.t,0);i<t.t;++i)r[this.t+i-e]=this.am(e-i,t[i],r,0,0,this.t+i-e);r.clamp(),r.drShiftTo(1,r)},f.prototype.square=function(){var t=d();return this.squareTo(t),t};var o=f,a=(p.prototype.convert=function(t){return t},p.prototype.revert=function(t){return t},p.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r)},p.prototype.sqrTo=function(t,e){t.squareTo(e)},p),u=(l.prototype.convert=function(t){return t.s<0||0<=t.compareTo(this.m)?t.mod(this.m):t},l.prototype.revert=function(t){return t},l.prototype.reduce=function(t){t.divRemTo(this.m,null,t)},l.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r),this.reduce(r)},l.prototype.sqrTo=function(t,e){t.squareTo(e),this.reduce(e)},l),c=(h.prototype.convert=function(t){var e=d();return t.abs().dlShiftTo(this.m.t,e),e.divRemTo(this.m,null,e),t.s<0&&0<e.compareTo(o.ZERO)&&this.m.subTo(e,e),e},h.prototype.revert=function(t){var e=d();return t.copyTo(e),this.reduce(e),e},h.prototype.reduce=function(t){for(;t.t<=this.mt2;)t[t.t++]=0;for(var e=0;e<this.m.t;++e){var r=32767&t[e],i=r*this.mpl+((r*this.mph+(t[e]>>15)*this.mpl&this.um)<<15)&t.DM;for(t[r=e+this.m.t]+=this.m.am(0,i,t,e,0,this.m.t);t[r]>=t.DV;)t[r]-=t.DV,t[++r]++}t.clamp(),t.drShiftTo(this.m.t,t),0<=t.compareTo(this.m)&&t.subTo(this.m,t)},h.prototype.mulTo=function(t,e,r){t.multiplyTo(e,r),this.reduce(r)},h.prototype.sqrTo=function(t,e){t.squareTo(e),this.reduce(e)},h);function h(t){this.m=t,this.mp=t.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<t.DB-15)-1,this.mt2=2*t.t}function l(t){this.m=t}function p(){}function f(t,e,r){null!=t&&"number"!=typeof t&&(null==e&&"string"!=typeof t?this.fromString(t,256):this.fromString(t,e))}function d(){return new o(null)}function g(t,e){return new o(t,e)}T="Microsoft Internet Explorer"==navigator.appName?(o.prototype.am=function(t,e,r,i,n,s){for(var o=32767&e,a=e>>15;0<=--s;){var u=32767&this[t],c=this[t++]>>15,h=a*u+c*o;n=((u=o*u+((32767&h)<<15)+r[i]+(1073741823&n))>>>30)+(h>>>15)+a*c+(n>>>30),r[i++]=1073741823&u}return n},30):"Netscape"!=navigator.appName?(o.prototype.am=function(t,e,r,i,n,s){for(;0<=--s;){var o=e*this[t++]+r[i]+n;n=Math.floor(o/67108864),r[i++]=67108863&o}return n},26):(o.prototype.am=function(t,e,r,i,n,s){for(var o=16383&e,a=e>>14;0<=--s;){var u=16383&this[t],c=this[t++]>>14,h=a*u+c*o;n=((u=o*u+((16383&h)<<14)+r[i]+n)>>28)+(h>>14)+a*c,r[i++]=268435455&u}return n},28),o.prototype.DB=T,o.prototype.DM=(1<<T)-1,o.prototype.DV=1<<T,o.prototype.FV=Math.pow(2,52),o.prototype.F1=52-T,o.prototype.F2=2*T-52;for(var m=[],y="0".charCodeAt(0),v=0;v<=9;++v)m[y++]=v;for(y="a".charCodeAt(0),v=10;v<36;++v)m[y++]=v;for(y="A".charCodeAt(0),v=10;v<36;++v)m[y++]=v;function _(t,e){return null==(t=m[t.charCodeAt(e)])?-1:t}function b(t){var e=d();return e.fromInt(t),e}function x(t){var e,r=1;return 0!=(e=t>>>16)&&(t=e,r+=16),0!=(e=t>>8)&&(t=e,r+=8),0!=(e=t>>4)&&(t=e,r+=4),0!=(e=t>>2)&&(t=e,r+=2),0!=(e=t>>1)&&(t=e,r+=1),r}o.ZERO=b(0),o.ONE=b(1),O.prototype.doPublic=function(t){return t.modPowInt(this.e,this.n)},O.prototype.setPublic=function(t,e){null!=t&&null!=e&&0<t.length&&0<e.length?(this.n=g(t,16),this.e=parseInt(e,16)):console.error("Invalid RSA public key")},O.prototype.verify=function(t,e,r){return e=g(e,16),null==(e=this.doPublic(e))?null:function(t){for(var e in S)if(S.hasOwnProperty(e)){var r=(e=S[e]).length;if(t.substr(0,r)==e)return t.substr(r)}return t}(e.toString(16).replace(/^1f+00/,""))==r(t).toString()};var w=O,S={md2:"3020300c06082a864886f70d020205000410",md5:"3020300c06082a864886f70d020505000410",sha1:"3021300906052b0e03021a05000414",sha224:"302d300d06096086480165030402040500041c",sha256:"3031300d060960864801650304020105000420",sha384:"3041300d060960864801650304020205000430",sha512:"3051300d060960864801650304020305000440",ripemd160:"3021300906052b2403020105000414"};function O(){this.n=null,this.e=0,this.d=null,this.p=null,this.q=null,this.dmp1=null,this.dmq1=null,this.coeff=null}E.prototype.verify=function(t,r,i){try{return this.getKey().verify(t,function(t){for(var r="",i=0,n=0,s=0;s<t.length&&"="!=t.charAt(s);++s){var o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(t.charAt(s));o<0||(i=0==i?(r+=e(o>>2),n=3&o,1):1==i?(r+=e(n<<2|o>>4),n=15&o,2):2==i?(r=(r+=e(n))+e(o>>2),n=3&o,3):(r=(r+=e(n<<2|o>>4))+e(15&o),0))}return 1==i&&(r+=e(n<<2)),r}(r),i)}catch(t){return!1}},E.prototype.getKey=function(t){return this.key||(this.key=new w),this.key},E.version="3.0.0-rc.1";var T=E;function E(t){this.key=null}t.JSEncrypt=T,t.default=T,Object.defineProperty(t,"__esModule",{value:!0})}(e)},857:function(t,e,r){r=r(772).Symbol,t.exports=r},366:function(t,e,r){var i=r(857),n=r(107),s=r(157),o=i?i.toStringTag:void 0;t.exports=function(t){return null==t?void 0===t?"[object Undefined]":"[object Null]":(o&&o in Object(t)?n:s)(t)}},704:function(t,e,r){var i=r(153),n=/^\s+/;t.exports=function(t){return t&&t.slice(0,i(t)+1).replace(n,"")}},242:function(t){var e="object"==typeof window&&window&&window.Object===Object&&window;t.exports=e},107:function(t,e,r){r=r(857);var i=Object.prototype,n=i.hasOwnProperty,s=i.toString,o=r?r.toStringTag:void 0;t.exports=function(t){var e=n.call(t,o),r=t[o];try{var i=!(t[o]=void 0)}catch(t){}var a=s.call(t);return i&&(e?t[o]=r:delete t[o]),a}},157:function(t){var e=Object.prototype.toString;t.exports=function(t){return e.call(t)}},772:function(t,e,r){r=r(242);var i="object"==typeof self&&self&&self.Object===Object&&self;r=r||i||Function("return this")(),t.exports=r},153:function(t){var e=/\s/;t.exports=function(t){for(var r=t.length;r--&&e.test(t.charAt(r)););return r}},73:function(t,e,r){var i=r(259),n=r(100),s=r(642),o=Math.max,a=Math.min;t.exports=function(t,e,r){var u,c,h,l,p,f,d=0,g=!1,m=!1,y=!0;if("function"!=typeof t)throw new TypeError("Expected a function");function v(e){var r=u,i=c;return u=c=void 0,d=e,l=t.apply(i,r)}function _(t){var r=t-f;return void 0===f||e<=r||r<0||m&&h<=t-d}function b(){var t,r=n();if(_(r))return x(r);p=setTimeout(b,(t=e-(r-f),m?a(t,h-(r-d)):t))}function x(t){return p=void 0,y&&u?v(t):(u=c=void 0,l)}function w(){var t=n(),r=_(t);if(u=arguments,c=this,f=t,r){if(void 0===p)return d=t=f,p=setTimeout(b,e),g?v(t):l;if(m)return clearTimeout(p),p=setTimeout(b,e),v(f)}return void 0===p&&(p=setTimeout(b,e)),l}return e=s(e)||0,i(r)&&(g=!!r.leading,h=(m="maxWait"in r)?o(s(r.maxWait)||0,e):h,y="trailing"in r?!!r.trailing:y),w.cancel=function(){void 0!==p&&clearTimeout(p),u=f=c=p=void(d=0)},w.flush=function(){return void 0===p?l:x(n())},w}},259:function(t){t.exports=function(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}},125:function(t){t.exports=function(t){return null!=t&&"object"==typeof t}},795:function(t,e,r){var i=r(366),n=r(125);t.exports=function(t){return"symbol"==typeof t||n(t)&&"[object Symbol]"==i(t)}},100:function(t,e,r){var i=r(772);t.exports=function(){return i.Date.now()}},642:function(t,e,r){var i=r(704),n=r(259),s=r(795),o=/^[-+]0x[0-9a-f]+$/i,a=/^0b[01]+$/i,u=/^0o[0-7]+$/i,c=parseInt;t.exports=function(t){if("number"==typeof t)return t;if(s(t))return NaN;if(n(t)&&(e="function"==typeof t.valueOf?t.valueOf():t,t=n(e)?e+"":e),"string"!=typeof t)return 0===t?t:+t;t=i(t);var e=a.test(t);return e||u.test(t)?c(t.slice(2),e?2:8):o.test(t)?NaN:+t}},737:function(t,e){var r;void 0!==(e="function"==typeof(r=function(){var t,e,r="lscache-",i="-cacheexpiration",n=6e4,s=_(n),o="",a=!1;function u(){var e="__lscachetest__";if(void 0!==t)return t;try{if(!localStorage)return!1}catch(e){return!1}try{f(e,"__lscachetest__"),d(e),t=!0}catch(e){t=!(!c(e)||!localStorage.length)}return t}function c(t){return t&&("QUOTA_EXCEEDED_ERR"===t.name||"NS_ERROR_DOM_QUOTA_REACHED"===t.name||"QuotaExceededError"===t.name)}function h(){return e=void 0===e?null!=window.JSON:e}function l(){return Math.floor((new Date).getTime()/n)}function p(t){return localStorage.getItem(r+o+t)}function f(t,e){localStorage.removeItem(r+o+t),localStorage.setItem(r+o+t,e)}function d(t){localStorage.removeItem(r+o+t)}function g(t){for(var e,n=new RegExp("^"+r+o.replace(/[[\]{}()*+?.\\^$|]/g,"\\$&")+"(.*)"),s=[],a=0;a<localStorage.length;a++)(e=(e=(e=localStorage.key(a))&&e.match(n))&&e[1])&&e.indexOf(i)<0&&s.push(e);for(a=0;a<s.length;a++)t(s[a],s[a]+i)}function m(t){var e=t+i;d(t),d(e)}function y(t){var e=t+i,r=p(e);return r&&(r=parseInt(r,10),l()>=r&&(d(t),d(e),1))}function v(t,e){a&&"console"in window&&"function"==typeof window.console.warn&&(window.console.warn("lscache - "+t),e&&window.console.warn("lscache - The error was: "+e.message))}function _(t){return Math.floor(864e13/t)}return{set:function(t,e,r){if(!u())return!1;if(!h())return!1;try{e=JSON.stringify(e)}catch(r){return!1}try{f(t,e)}catch(r){if(!c(r))return v("Could not add item with key '"+t+"'",r),!1;for(var n,o=[],a=(g((function(t,e){e=(e=p(e))?parseInt(e,10):s,o.push({key:t,size:(p(t)||"").length,expiration:e})})),o.sort((function(t,e){return e.expiration-t.expiration})),(e||"").length);o.length&&0<a;)v("Cache is full, removing item with key '"+(n=o.pop()).key+"'"),m(n.key),a-=n.size;try{f(t,e)}catch(r){return v("Could not add item with key '"+t+"', perhaps it's too big?",r),!1}}return r?f(t+i,(l()+r).toString(10)):d(t+i),!0},get:function(t){if(!u())return null;if(y(t))return null;if(!(t=p(t))||!h())return t;try{return JSON.parse(t)}catch(e){return t}},remove:function(t){u()&&m(t)},supported:u,flush:function(){u()&&g((function(t){m(t)}))},flushExpired:function(){u()&&g((function(t){y(t)}))},setBucket:function(t){o=t},resetBucket:function(){o=""},getExpiryMilliseconds:function(){return n},setExpiryMilliseconds:function(t){s=_(n=t)},enableWarnings:function(t){a=t}}})?r.apply(e,[]):r)&&(t.exports=e)},762:function(t,e,r){function i(t,e){t.constructor==String?t=(e&&"binary"===e.encoding?a:s).stringToBytes(t):o(t)?t=Array.prototype.slice.call(t,0):Array.isArray(t)||t.constructor===Uint8Array||(t=t.toString());for(var r=n.bytesToWords(t),u=(e=8*t.length,1732584193),c=-271733879,h=-1732584194,l=271733878,p=0;p<r.length;p++)r[p]=16711935&(r[p]<<8|r[p]>>>24)|4278255360&(r[p]<<24|r[p]>>>8);r[e>>>5]|=128<<e%32,r[14+(64+e>>>9<<4)]=e;var f=i._ff,d=i._gg,g=i._hh,m=i._ii;for(p=0;p<r.length;p+=16){var y=u,v=c,_=h,b=l;u=f(u,c,h,l,r[p+0],7,-680876936),l=f(l,u,c,h,r[p+1],12,-389564586),h=f(h,l,u,c,r[p+2],17,606105819),c=f(c,h,l,u,r[p+3],22,-1044525330),u=f(u,c,h,l,r[p+4],7,-176418897),l=f(l,u,c,h,r[p+5],12,1200080426),h=f(h,l,u,c,r[p+6],17,-1473231341),c=f(c,h,l,u,r[p+7],22,-45705983),u=f(u,c,h,l,r[p+8],7,1770035416),l=f(l,u,c,h,r[p+9],12,-1958414417),h=f(h,l,u,c,r[p+10],17,-42063),c=f(c,h,l,u,r[p+11],22,-1990404162),u=f(u,c,h,l,r[p+12],7,1804603682),l=f(l,u,c,h,r[p+13],12,-40341101),h=f(h,l,u,c,r[p+14],17,-1502002290),u=d(u,c=f(c,h,l,u,r[p+15],22,1236535329),h,l,r[p+1],5,-165796510),l=d(l,u,c,h,r[p+6],9,-1069501632),h=d(h,l,u,c,r[p+11],14,643717713),c=d(c,h,l,u,r[p+0],20,-373897302),u=d(u,c,h,l,r[p+5],5,-701558691),l=d(l,u,c,h,r[p+10],9,38016083),h=d(h,l,u,c,r[p+15],14,-660478335),c=d(c,h,l,u,r[p+4],20,-405537848),u=d(u,c,h,l,r[p+9],5,568446438),l=d(l,u,c,h,r[p+14],9,-1019803690),h=d(h,l,u,c,r[p+3],14,-187363961),c=d(c,h,l,u,r[p+8],20,1163531501),u=d(u,c,h,l,r[p+13],5,-1444681467),l=d(l,u,c,h,r[p+2],9,-51403784),h=d(h,l,u,c,r[p+7],14,1735328473),u=g(u,c=d(c,h,l,u,r[p+12],20,-1926607734),h,l,r[p+5],4,-378558),l=g(l,u,c,h,r[p+8],11,-2022574463),h=g(h,l,u,c,r[p+11],16,1839030562),c=g(c,h,l,u,r[p+14],23,-35309556),u=g(u,c,h,l,r[p+1],4,-1530992060),l=g(l,u,c,h,r[p+4],11,1272893353),h=g(h,l,u,c,r[p+7],16,-155497632),c=g(c,h,l,u,r[p+10],23,-1094730640),u=g(u,c,h,l,r[p+13],4,681279174),l=g(l,u,c,h,r[p+0],11,-358537222),h=g(h,l,u,c,r[p+3],16,-722521979),c=g(c,h,l,u,r[p+6],23,76029189),u=g(u,c,h,l,r[p+9],4,-640364487),l=g(l,u,c,h,r[p+12],11,-421815835),h=g(h,l,u,c,r[p+15],16,530742520),u=m(u,c=g(c,h,l,u,r[p+2],23,-995338651),h,l,r[p+0],6,-198630844),l=m(l,u,c,h,r[p+7],10,1126891415),h=m(h,l,u,c,r[p+14],15,-1416354905),c=m(c,h,l,u,r[p+5],21,-57434055),u=m(u,c,h,l,r[p+12],6,1700485571),l=m(l,u,c,h,r[p+3],10,-1894986606),h=m(h,l,u,c,r[p+10],15,-1051523),c=m(c,h,l,u,r[p+1],21,-2054922799),u=m(u,c,h,l,r[p+8],6,1873313359),l=m(l,u,c,h,r[p+15],10,-30611744),h=m(h,l,u,c,r[p+6],15,-1560198380),c=m(c,h,l,u,r[p+13],21,1309151649),u=m(u,c,h,l,r[p+4],6,-145523070),l=m(l,u,c,h,r[p+11],10,-1120210379),h=m(h,l,u,c,r[p+2],15,718787259),c=m(c,h,l,u,r[p+9],21,-343485551),u=u+y>>>0,c=c+v>>>0,h=h+_>>>0,l=l+b>>>0}return n.endian([u,c,h,l])}var n=r(562),s=r(792).utf8,o=r(335),a=r(792).bin;i._ff=function(t,e,r,i,n,s,o){return((t=t+(e&r|~e&i)+(n>>>0)+o)<<s|t>>>32-s)+e},i._gg=function(t,e,r,i,n,s,o){return((t=t+(e&i|r&~i)+(n>>>0)+o)<<s|t>>>32-s)+e},i._hh=function(t,e,r,i,n,s,o){return((t=t+(e^r^i)+(n>>>0)+o)<<s|t>>>32-s)+e},i._ii=function(t,e,r,i,n,s,o){return((t=t+(r^(e|~i))+(n>>>0)+o)<<s|t>>>32-s)+e},i._blocksize=16,i._digestsize=16,t.exports=function(t,e){if(null==t)throw new Error("Illegal argument "+t);return t=n.wordsToBytes(i(t,e)),e&&e.asBytes?t:e&&e.asString?a.bytesToString(t):n.bytesToHex(t)}},189:function(t){for(var e=[],r=0;r<256;++r)e[r]=(r+256).toString(16).substr(1);t.exports=function(t,r){return r=r||0,e[t[r++]]+e[t[r++]]+e[t[r++]]+e[t[r++]]+"-"+e[t[r++]]+e[t[r++]]+"-"+e[t[r++]]+e[t[r++]]+"-"+e[t[r++]]+e[t[r++]]+"-"+e[t[r++]]+e[t[r++]]+e[t[r++]]+e[t[r++]]+e[t[r++]]+e[t[r]]}},532:function(t){var e,r,i,n="undefined"!=typeof window&&(window.crypto||window.msCrypto);n&&n.getRandomValues&&(e=new Uint8Array(16),r=function(){return n.getRandomValues(e),e}),r||(i=new Array(16),r=function(){for(var t,e=0;e<16;e++)0==(3&e)&&(t=4294967296*Math.random()),i[e]=t>>>((3&e)<<3)&255;return i}),t.exports=r},953:function(t,e,r){var i=r(532),n=r(189);t.exports=function(t,e,r){var s=e&&r||0,o=("string"==typeof t&&(e="binary"==t?new Array(16):null,t=null),(t=t||{}).random||(t.rng||i)());if(o[6]=15&o[6]|64,o[8]=63&o[8]|128,e)for(var a=0;a<16;++a)e[s+a]=o[a];return e||n(o)}},300:function(e){"use strict";e.exports=t}},i={},e.n=function(t){var r=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(r,{a:r}),r},e.d=function(t,r){for(var i in r)e.o(r,i)&&!e.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:r[i]})},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n={},function(){"use strict";e.d(n,{default:function(){return Fr}});var t={},r=(e.r(t),e.d(t,{and:function(){return q},b64d:function(){return bt},concat:function(){return _t},eq:function(){return W},flagValue:function(){return ft},gt:function(){return X},gte:function(){return rt},ifThen:function(){return Z},inArray:function(){return yt},isInPercentage:function(){return lt},isInPercentageRange:function(){return pt},isInTargetGroup:function(){return dt},isTargetGroupPaired:function(){return gt},isUndefined:function(){return H},lt:function(){return Y},lte:function(){return Q},match:function(){return it},md5:function(){return vt},mergeSeed:function(){return ht},ne:function(){return J},not:function(){return G},now:function(){return K},numeq:function(){return et},numne:function(){return tt},operatorsWithContext:function(){return xt},or:function(){return $},property:function(){return mt},semverEq:function(){return ut},semverGt:function(){return ot},semverGte:function(){return at},semverLt:function(){return nt},semverLte:function(){return st},semverNe:function(){return ct}}),{}),i=(e.r(r),e.d(r,{CallContextTypes:function(){return Ht},CustomProperty:function(){return ge},DeploymentConfiguration:function(){return re},DeviceProperty:function(){return Pe},Experiment:function(){return ie},FlagTypes:function(){return Kt},RoxStringBase:function(){return qt},TargetGroup:function(){return se}}),{}),s=(e.r(i),e.d(i,{ConfigurationParser:function(){return ae},RoxxParser:function(){return Mt}}),{}),o=(e.r(s),e.d(s,{clearAllOverrides:function(){return $e},clearOverride:function(){return qe},getOriginalValue:function(){return Je},getOverride:function(){return He},hasOverride:function(){return Le},setOverride:function(){return Ke}}),{});e.r(o),e.d(o,{CustomProperties:function(){return m},Experiments:function(){return p},Flags:function(){return f},TargetGroups:function(){return g}});const a={debug:0,info:1,warn:2,error:3};let u="error",c=new class{constructor(){this.debug=(t,...e)=>{a[u]<=a.debug&&console&&console.log(t,...e)},this.info=(t,...e)=>{a[u]<=a.info&&console&&console.info(t,...e)},this.warn=(t,...e)=>{a[u]<=a.warn&&console&&console.warn(t,...e)},this.error=(t,...e)=>{console&&console.error(t,...e)},this.setVerboseMode=t=>{"verbose"===t?(u="debug",this.debug("Active verbose mode")):u="error"},this.setLogger=t=>{c=t}}};var h=c;class l{constructor(t,e){this.flagRepo=t,this.experimentsRepo=e}prepareFlagsWithExperiments(){const t=this.experimentsRepo.experiments||[],e=(h.debug("Set experiments "+JSON.stringify(t)),[]);t.forEach((t=>{t&&t.flags.forEach((r=>{(r=r&&this.flagRepo.flagWithName(r.name))&&(e.push(r),this.connectExperimentToFlag(r,t.deploymentConfiguration.condition))}))})),this.flagRepo.flags.forEach((t=>{e.some((e=>e===t))||this.connectExperimentToFlag(t,void 0)}))}setAddedFlag(t){var e=this.experimentsRepo.experimentForFlag(t);e&&this.connectExperimentToFlag(t,e.deploymentConfiguration.condition)}connectExperimentToFlag(t,e){t.condition=e}}var p=new class{constructor(){this.map={}}setExperiments(t){this.map={},(t=t||[]).forEach((function(t){this.map[t.identifier]=t}),this)}experimentWithName(t){return this.map[t]}get experiments(){return Object.keys(this.map).map((t=>this.map[t]))}experimentForFlagName(t){return this.experiments.find((e=>e.flags&&e.flags.some((e=>e.name===t))))}experimentForFlag(t){return this.experimentForFlagName(t.name)}},f=new class{constructor(){this.map={}}addFlag(t,e){e.name=t,this.map[t]=e,new l(this,p).setAddedFlag(e)}flagWithName(t){return this.map[t]}get flags(){return Object.keys(this.map).map((t=>this.map[t]))}get items(){return this.flags}};class d{constructor(t,e,r){this._string=t,this._delimiters=e,this._returnDelim=r,this._position=0}countTokens(){let t=0,e=!1;for(let r=this._position,i=this._string.length;r<i;r++)-1!=this._delimiters.indexOf(this._string.charAt(r))?(this._returnDelim&&t++,e&&(t++,e=!1)):e=!0;return e&&t++,t}hasMoreElements(){return this.hasMoreTokens()}hasMoreTokens(){if(!this._delimiters)return!1;var t=this._string.length;if(this._position<t){if(this._returnDelim)return!0;for(let e=this._position;e<t;e++)if(-1==this._delimiters.indexOf(this._string.charAt(e)))return!0}return!1}nextElement(){return this.nextToken()}nextToken(){if(this._delimiters){let e=this._position;var t=this._string.length;if(e<t){if(this._returnDelim){if(-1!=this._delimiters.indexOf(this._string.charAt(this._position)))return this._string.charAt(this._position++);for(this._position++;this._position<t;this._position++)if(-1!=this._delimiters.indexOf(this._string.charAt(this._position)))return this._string.substr(e,this._position-e);return this._string.substr(e)}for(;e<t&&-1!=this._delimiters.indexOf(this._string.charAt(this._position));)e++;if((this._position=e)<t){for(this._position++;this._position<t;this._position++)if(-1!=this._delimiters.indexOf(this._string.charAt(this._position)))return this._string.substr(e,this._position-e);return this._string.substr(e)}}}}nextTokenWithDelimiters(t){return this._delimiters=t,this.nextToken()}}var g=new class{constructor(){this.map={}}addTargetGroup(t){this.map[t.identifier]=t}setTargetGroups(t){this.map={},(t=t||[]).forEach((function(t){this.map[t.identifier]=t}),this)}targetGroupWithName(t){return this.map[t]}get targetGroups(){return Object.keys(this.map).map((t=>this.map[t]))}},m=new class{constructor(){this.store=new Map}has(t){return this.store.has(t.name)}get(t){return this.store.get(t)}set(t){this.store.set(t.name,t)}setIfNotExists(t){this.has(t)||this.set(t)}clear(){this.store.clear()}get items(){return Array.from(this.store.values())}},y=e(762),v=e.n(y),_=(y="function"==typeof atob,"function"==typeof btoa),b="function"==typeof Buffer;const x="function"==typeof TextDecoder?new TextDecoder:void 0,w="function"==typeof TextEncoder?new TextEncoder:void 0,S=Array.prototype.slice.call("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="),O=(t=>{let e={};return t.forEach(((t,r)=>e[t]=r)),e})(S),T=/^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/,E=String.fromCharCode.bind(String),N="function"==typeof Uint8Array.from?Uint8Array.from.bind(Uint8Array):(t,e=(t=>t))=>new Uint8Array(Array.prototype.slice.call(t,0).map(e)),A=t=>t.replace(/[^A-Za-z0-9\+\/]/g,""),P=_?t=>btoa(t):b?t=>Buffer.from(t,"binary").toString("base64"):t=>{let e,r,i,n,s="";var o=t.length%3;for(let o=0;o<t.length;){if(255<(r=t.charCodeAt(o++))||255<(i=t.charCodeAt(o++))||255<(n=t.charCodeAt(o++)))throw new TypeError("invalid character found");e=r<<16|i<<8|n,s+=S[e>>18&63]+S[e>>12&63]+S[e>>6&63]+S[63&e]}return o?s.slice(0,o-3)+"===".substring(o):s},D=b?t=>Buffer.from(t).toString("base64"):t=>{let e=[];for(let r=0,i=t.length;r<i;r+=4096)e.push(E.apply(null,t.subarray(r,r+4096)));return P(e.join(""))},C=t=>{var e;return t.length<2?(e=t.charCodeAt(0))<128?t:e<2048?E(192|e>>>6)+E(128|63&e):E(224|e>>>12&15)+E(128|e>>>6&63)+E(128|63&e):(e=65536+1024*(t.charCodeAt(0)-55296)+(t.charCodeAt(1)-56320),E(240|e>>>18&7)+E(128|e>>>12&63)+E(128|e>>>6&63)+E(128|63&e))},R=/[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g,I=b?t=>Buffer.from(t,"utf8").toString("base64"):w?t=>D(w.encode(t)):t=>P((t=>t.replace(R,C))(t)),k=/[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g,F=t=>{switch(t.length){case 4:var e=((7&t.charCodeAt(0))<<18|(63&t.charCodeAt(1))<<12|(63&t.charCodeAt(2))<<6|63&t.charCodeAt(3))-65536;return E(55296+(e>>>10))+E(56320+(1023&e));case 3:return E((15&t.charCodeAt(0))<<12|(63&t.charCodeAt(1))<<6|63&t.charCodeAt(2));default:return E((31&t.charCodeAt(0))<<6|63&t.charCodeAt(1))}},M=y?t=>atob(A(t)):b?t=>Buffer.from(t,"base64").toString("binary"):t=>{if(t=t.replace(/\s+/g,""),!T.test(t))throw new TypeError("malformed base64.");t+="==".slice(2-(3&t.length));let e,r,i,n="";for(let s=0;s<t.length;)e=O[t.charAt(s++)]<<18|O[t.charAt(s++)]<<12|(r=O[t.charAt(s++)])<<6|(i=O[t.charAt(s++)]),n+=64===r?E(e>>16&255):64===i?E(e>>16&255,e>>8&255):E(e>>16&255,e>>8&255,255&e);return n},B=b?t=>N(Buffer.from(t,"base64")):t=>N(M(t),(t=>t.charCodeAt(0))),j=b?t=>Buffer.from(t,"base64").toString("utf8"):x?t=>x.decode(B(t)):t=>(t=>t.replace(k,F))(M(t));let U=(t,e)=>e?e[t]:void 0;var V=new class{invoke(t,e){if(this.userUnhandledErrorHandler)try{this.userUnhandledErrorHandler(t,e)}catch(t){h.error("User Unhandled Error Handler itself threw an exception. original exception:"+e,t)}else h.error("User Unhandled Error Occured, no fallback handler was set, exception ignored.",e)}setHandler(t){t instanceof Function?this.userUnhandledErrorHandler=t:h.warn("UserspaceUnhandledErrorHandler must be a function. default will be used.")}};function z(t,e,r={zeroExtend:!0,lexicographical:!0}){const i=r&&r.lexicographical;r=r&&r.zeroExtend;let n=t.split("."),s=e.split(".");function o(t){return(i?/[0-9A-Za-z_-]+$/:/^\d+$/).test(t)}if(!n.every(o)||!s.every(o))return NaN;if(r){for(;n.length<s.length;)n.push("0");for(;s.length<n.length;)s.push("0")}i||(n=n.map(Number),s=s.map(Number));for(let t=0;t<n.length;++t){if(s.length==t)return 1;if(n[t]!=s[t])return n[t]>s[t]?1:-1}return n.length!=s.length?-1:0}const L=t=>((255&(t=v()(t,{asBytes:!0}))[0]|(255&t[1])<<8|(255&t[2])<<16|(255&t[3])<<24)>>>0)/(Math.pow(2,32)-1),H=t=>void 0===t,K=()=>Date.now(),q=(t,e)=>t&&e,$=(t,e)=>t||e,J=(t,e)=>(!H(t)&&t)!==(!H(e)&&e),W=(t,e)=>(!H(t)&&t)===(!H(e)&&e),G=t=>!t,Z=(t,e,r)=>t?e:r,Y=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||!(t<e)),Q=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||!(t<=e)),X=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||!(e<t)),tt=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||t===e),et=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||t!==e),rt=(t,e)=>!(H(t)||H(e)||"number"!=typeof t&&(t=Number(t),isNaN(t))||"number"!=typeof e&&(e=Number(e),isNaN(e))||!(e<=t)),it=(t,e,r)=>!!new RegExp(e,r).exec(t),nt=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&z(t,e,{zeroExtend:!0})<0,st=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&z(t,e,{zeroExtend:!0})<=0,ot=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&0<z(t,e,{zeroExtend:!0}),at=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&0<=z(t,e,{zeroExtend:!0}),ut=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&0==z(t,e),ct=(t,e)=>!H(t)&&!H(e)&&"string"==typeof t&&"string"==typeof e&&0!=z(t,e),ht=(t,e)=>t+"."+e,lt=(t,e)=>L(e)<=t,pt=(t,e,r)=>t<=(r=L(r))&&r<=e,ft=(t,e={},r={})=>{const i=f.flagWithName(t);if(i)return n=Object.assign({},r),i.getInternalValue(n,e),n.isPeek||n.result.isOverride||n.result.isFreezed||i._flagImpression(n.result.value,n.result.usedContext),n.result.value;var n=p.experimentForFlagName(t);return n&&n.deploymentConfiguration&&(new Mt).evaluateExpression(n.deploymentConfiguration.condition,r,e)||"false"},dt=(t,e={},r={})=>!!(t=g.targetGroupWithName(t))&&(new Mt).evaluateExpression(t.condition,r,e),gt=()=>!1,mt=(t,e={})=>{const r=m.get(t);if(r)return r.getValue(e);{const i=U;let n;if(i)if(i._isUserDefined)try{n=i(t,e)}catch(r){throw r.isUserError=!0,r.trigger="DYNAMIC_PROPERTIES_RULE",r}else n=i(t,e);return n}},yt=(t,e)=>!!e&&e.includes(t),vt=t=>{if("string"==typeof t)return v()(t)},_t=(t,e)=>{if("string"==typeof t&&"string"==typeof e)return""+t+e},bt=t=>{if("string"==typeof t)return decodeURIComponent((t=>j((t=>A(t.replace(/[-_]/g,(t=>"-"==t?"+":"/"))))(t)))(t))},xt=[dt,ft,mt],wt=Object.keys(t),St='{}[]():, \t\r\n"',Ot="operator",Tt="operand";class Et{constructor(){this.tokenArray=[],this.arrayAccumulator=void 0,this.dictionaryAccumulator=void 0,this.dictKey=void 0}_stringToRoxx(t){return wt.includes(t)?{type:Ot,value:t}:"true"==t?{type:Tt,value:!0}:"false"==t?{type:Tt,value:!1}:"undefined"==t?{type:Tt,value:void 0}:'"'==t.charAt(0)&&'"'==t.charAt(t.length-1)?{type:Tt,value:t.substr(1,t.length-2)}:isNaN(t)?{type:"UNKNOWN"}:{type:Tt,value:+t}}push(t){this.dictionaryAccumulator&&!this.dictKey?this.dictKey=t.value:this.dictionaryAccumulator&&this.dictKey?(this.dictionaryAccumulator[this.dictKey]=t.value,this.dictKey=void 0):this.arrayAccumulator?this.arrayAccumulator.push(t.value):this.tokenArray.push(t)}tokenize(t){this.tokenArray=[],this.arrayAccumulator=void 0,this.dictionaryAccumulator=void 0;let e=St;t=t.replace('\\"',"\\RO_Q");const r=new d(t,e,!0);let i,n;for(;r.hasMoreTokens();)switch(n=i,i=r.nextTokenWithDelimiters(e)){case"{":this.dictionaryAccumulator={};break;case"}":this.tokenArray.push({type:Tt,value:this.dictionaryAccumulator}),this.dictionaryAccumulator=void 0;break;case"[":this.arrayAccumulator=[];break;case"]":this.tokenArray.push({type:Tt,value:this.arrayAccumulator}),this.arrayAccumulator=void 0;break;case'"':'"'==n&&this.push({type:Tt,value:""}),e='"'==e?St:'"';break;default:'"'==e?this.push({type:Tt,value:i.replace("\\RO_Q",'\\"')}):-1==St.indexOf(i)&&this.push(this._stringToRoxx(i))}return this.tokenArray}}_=e(300);var Nt=e.n(_);const At="roxTargetUrl",Pt="roxAuth";class Dt{constructor(t){this._proxyUrl="",this._proxyAuthHeader="",this._proxySettings=!1,t&&(this._proxySettings=Object.assign({},t),this._proxyUrl=this._proxySettings.protocol+"://"+this._proxySettings.host+(this._proxySettings.port?":"+this._proxySettings.port:""),this._proxySettings.auth&&this._proxySettings.auth.username&&this._proxySettings.auth.password&&(this._proxyAuthHeader="Basic "+((t,e=!1)=>e?I(t).replace(/=/g,"").replace(/[+\/]/g,(t=>"+"==t?"-":"_")):I(t))(this._proxySettings.auth.username+":"+this._proxySettings.auth.password),this._proxyAuthHeaderEncoded=encodeURIComponent(this._proxyAuthHeader)))}applyProxyToRequest(t){if(this._proxySettings){t.options=t.options?Object.assign({},t.options):{};const e=t.options;e.params=e.params||{},e.params[At]=t.url,this._proxyAuthHeader&&(e.params[Pt]=this._proxyAuthHeader),t.url=this._proxyUrl}}applyProxyToSseRequest(t){this._proxySettings&&(t.url=`${this._proxyUrl}?${At}=`+encodeURIComponent(t.url),this._proxyAuthHeaderEncoded&&(t.url=`${t.url}&${Pt}=`+this._proxyAuthHeaderEncoded))}get proxyUrl(){return this._proxyUrl}}const Ct="x-api.rollout.io";let Rt=new Dt;function It(t){let e=Ct;return{API_HOST:e=t?""+t+Ct:e,CD_API_ENDPOINT:`https://${e}/device/get_configuration`,CD_S3_ENDPOINT:"https://conf.rollout.io/",SS_API_ENDPOINT:`https://${e}/device/update_state_store/`,SS_S3_ENDPOINT:"https://statestore.rollout.io/",CLIENT_DATA_CACHE_KEY:"client_data",NOTIFICATIONS_ENDPOINT:"https://push.rollout.io/sse",ANALYTICS_ENDPOINT:"https://analytic.rollout.io"}}let kt=Object.assign({},It());var Ft=new class{init(t,e,r,i){var n,s,o,a;this.selfManagedMode=i,this.selfManagedMode||(({distinct_id:e,app_release:n,platform:s,api_version:o,lib_version:a}=i=e.getProperties()),i=function(t,e){var r={};for(n in t)Object.prototype.hasOwnProperty.call(t,n)&&e.indexOf(n)<0&&(r[n]=t[n]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols)for(var i=0,n=Object.getOwnPropertySymbols(t);i<n.length;i++)e.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(t,n[i])&&(r[n[i]]=t[n[i]]);return r}(i,["distinct_id","app_release","platform","api_version","lib_version"]),this.device=i,this.header={apiKey:"abbf3bd9c6e80eb1e8c0566c35b08748",notifier:{name:"Rollout JavaScript SDK",version:a,url:"undefined"!=typeof window&&window.location&&window.location.href||void 0}},this.networkOptions=r,this.user={distinct_id:e,app_release:n,app_key:t,platform:s},this.app={api_version:o,lib_version:a})}error(t,e){if(!this.selfManagedMode)return this._notify("error",t,e)}_notify(t,e,r){const i={payloadVersion:4,exceptions:[],app:this.app,user:this.user,device:this.device,metaData:{data:{message:e,exception:r.toString()}},severity:t};return r instanceof Error?(i.exceptions.push({errorClass:r.name,message:e+"\n"+r.message,stacktrace:r.stack||""}),i.groupingHash=r.fileName):i.exceptions.push({errorClass:"Error",message:e,stacktrace:[]}),this._send([i])}_send(t){t=Object.assign({events:t},this.header),h.debug("Sending bugsnag error report."),t={url:"https://notify.bugsnag.com",data:t,options:this.networkOptions},Rt.applyProxyToRequest(t);try{Nt().post(t.url,t.data,t.options).then((()=>{h.debug("Successfully sent error report.")})).catch((t=>{h.debug("Failed to send error report",t)}))}catch(t){h.debug("Failed to send error report.",t)}}};class Mt{constructor(t){this._tokenizer=new Et,this._cache=t||{}}_argsArrayForOperator(t,e){const r=[];var i=t.length;for(let t=0;t<i;t++){var n=e.pop();r.push(n)}return r}_modifyArgsHook({operator:t,args:e,context:r,callContext:i}){let n=e;return r&&xt.includes(t)&&(n=[...e,r]),i?[...n,i]:n}compileExpression(t){let e=this._cache[t];return e||(e=this._tokenizer.tokenize(t).reverse(),this._cache[t]=e),e}evaluateExpression(e,r={},i={},n){const s=[];var o=this.compileExpression(e);let a;var u=o.length;try{for(let e=0;e<u;e++){var c=o[e];if(c.type==Tt)s.push(c.value);else{if(c.type!=Ot){s.push(void 0);break}{const e=t[c.value];var l=this._argsArrayForOperator(e,s),p=(l=this._modifyArgsHook({operator:e,args:l,context:i,callContext:r}),e.apply(this,l)),f=(s.push(p),`${c.value}(${JSON.stringify(l)}) => `+p);n&&n.push(f),h.debug("Roxx: "+f)}}}a=s.pop()}catch(t){var d="Oh uh! An error occured during Roxx evaluation. "+e;t.isUserError?V.invoke(t.trigger,t):Ft.error(d,t),h.error(d,t),a=!1}finally{return a}}}let Bt=!1;const jt={"rox.internal.pushUpdates":"true","rox.internal.considerThrottleInPush":"false","rox.internal.throttleFetchInSeconds":"0","rox.internal.analytics":"true"};function Ut(t){return"boolean"==typeof(t=Vt(t))?t:"true"===t}function Vt(t){return Bt&&Object.prototype.hasOwnProperty.call(jt,t)?jt[t]:(t=p.experimentForFlagName(t))&&t.deploymentConfiguration?(new Mt).evaluateExpression(t.deploymentConfiguration.condition):""}let zt=null,Lt=null;const Ht={frozenOrCalc:"frozenValueOrOneTimeEval",oneTimeCalc:"oneTimeEval",default:"useFrozen"},Kt={boolean:"boolean",number:"number",string:"string"};class qt{constructor(t,e,r){if(this._type=r,r=this._validateDefault(t),Array.isArray(e))this._validateOptions(e),this._options=e.map((t=>t.toString()));else{if(null!=e)throw new Error("RoxStringBase wrong variations type");this._options=[]}-1===this._options.indexOf(r)&&this._options.push(r),this._value=this._defaultValue=r,this._frozen=!1,this._freezable=!0}_validateDefault(t){if(typeof t!==this._type)throw new Error(`RoxStringBase default value must be of ${this._type} type. Received '${t}'`);return t.toString()}_validateOptions(t){var e=new Error(`RoxStringBase options must be a non-empty array of ${this._type}. Received '${t}'`);if(!t.every((t=>typeof t===this._type)))throw e}get defaultValue(){return this._defaultValue}get overridenValue(){if(this.overrider.hasOverride(this.name))return this.overrider.getOverride(this.name)}get overrider(){throw new Error("Not implemented")}getInternalValue(t,e){throw Error("not implemented")}set name(t){this._name=t}get name(){return this._name}_getNameDetails(){if(this.name){const t=this.name.split(".");return{name:t.pop(),namespace:t.join(".")||"default"}}}dump(){var t={type:Ht.frozenOrCalc};return this.getInternalValue(t),{name:this.name,type:this._type,nameDetails:this._getNameDetails(),options:[...this._options],defaultValue:this.defaultValue,originalValue:this._originalValue(),overridingValue:this.overridenValue,value:t.result.value}}getActiveValue(t,e){throw new Error("Not implemented")}_originalValue(){var t={type:Ht.frozenOrCalc};return this.getActiveValue(t),t.result.value}_flagImpression(t,e){var r=p.experimentForFlag(this);try{if(Lt&&Ut("rox.internal.analytics")){var i=r&&r.stickinessProperty;let s=i&&m.get(i);var n=(s=s||m.get("rox.distinct_id"))?s.getValue(e):"";Lt.track({flag:this.name,value:t,distinctId:n,type:"IMPRESSION",time:(new Date).getTime()})}}catch(t){h.error("Failed to send analytics",t)}if("function"==typeof zt){i=!!r;try{zt({name:this.name,value:t,targeting:i},e)}catch(t){V.invoke("IMPRESSION_HANDLER",t)}}}static _normalizeString(t){return t}static _normalizeNumber(t){return Number(t)}static _normalizeBoolean(t){return"boolean"==typeof t?t:"true"===t}}const $t={flagsRepository:f};function Jt(t,e=null){const{app_key:r,buid:i,relative_url:n}=t,s=function(t,e){var r={};for(n in t)Object.prototype.hasOwnProperty.call(t,n)&&e.indexOf(n)<0&&(r[n]=t[n]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols)for(var i=0,n=Object.getOwnPropertySymbols(t);i<n.length;i++)e.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(t,n[i])&&(r[n[i]]=t[n[i]]);return r}(t,["app_key","buid","relative_url"]);return s.cache_miss_relative_url=n,t=kt.CD_API_ENDPOINT+`/${r}/`+i,{url:e||t,body:s}}function Wt(t,e=null){return{url:e||""+kt.SS_API_ENDPOINT+t.app_key+"/"+t.md5,body:{platform:t.platform,feature_flags:t.feature_flags,custom_properties:t.custom_properties,devModeSecret:t.devModeSecret}}}function Gt(t){var{data:t,status:e}=t;return 200===e&&t&&"object"==typeof t?(h.debug("succeed fetch from API"),t):Promise.reject(new Error("Unexpected response from ROX API"))}function Zt(t,e,r){return t={url:t,data:e,options:r},Rt.applyProxyToRequest(t),Nt().post(t.url,t.data,t.options).then(Gt)}function Yt(t,e,r){return t={url:t,data:e,options:r},Rt.applyProxyToRequest(t),Nt().post(t.url,t.data,t.options).then((({status:t})=>{if(200!==t)return Promise.reject(new Error("Unexpected response from ROX API"));h.debug("succeed setState from API")}))}function Qt(t){return t.catch((t=>{throw t.message="Unable to fetch rox configuration!\n"+t.message,h.error(t),t}))}const Xt=["lib_version","api_version","platform","app_key","customSigningCertificate"],te=["platform","app_key","feature_flags","custom_properties","devModeSecret"];function ee(t={},e=[]){const r=e.map((e=>{var r=t[e];return r?r.constructor===Object||r.constructor===Array?JSON.stringify(r):r:e}));return v()(r.join("|"))}class re{constructor(t){this.condition=t}}class ie{constructor(t,e,r,i,n,s,o,a){this.identifier=t,this.name=e,this.archived=r,this.sticky=i,this.deploymentConfiguration=n,this.flags=s,this.labels=o,this.stickinessProperty=a}}class ne{constructor(t){this._json=t}parse(){if(!this._json||!this._json.length)return[];const t=[];return this._json.forEach((e=>{var r,i;e&&e.deploymentConfiguration&&e._id&&e.name&&e.featureFlags&&(i=e.deploymentConfiguration).condition&&(r=e.labels||[],i=new re(i.condition),t.push(new ie(e._id,e.name,!!e.archived,!!e.sticky,i,e.featureFlags,r,e.stickinessProperty)))})),t}}class se{constructor(t,e){this.identifier=t,this.condition=e}}class oe{constructor(t){this._json=t}parse(){if(!this._json||!this._json.length)return[];const t=[];return this._json.forEach((e=>{e&&e._id&&e.condition&&t.push(new se(e._id,e.condition))})),t}}class ae{constructor(t,e,r=!0){if(!t||"object"!=typeof t)throw new Error("ConfigurationParser should be constructed with JSON object. Received "+t);if(!e||"string"!=typeof e)throw new Error("ConfigurationParser should be constructed with app key string. Received "+e);this._json=t,this._appKey=e,this._validateAppKey=r}parse(){var t=this._extractInnerJson(this._json);return this._validateAppKey&&t.application!==this._appKey?null:(this._parseExperiments(t.experiments),this._parseTargetGroups(t.targetGroups),this._signedDate=new Date(this._json.signed_date),this)}experiments(){return this._experiments||[]}targetGroups(){return this._targetGroups||[]}signedDate(){return this._signedDate}_extractInnerJson(t){return JSON.parse(t.data)}_parseExperiments(t){this._experiments=new ne(t).parse()}_parseTargetGroups(t){this._targetGroups=new oe(t).parse()}}const ue="ERROR_FETCH_FAILED";class ce{constructor(t,e,r,i,n){this.fetcherStatus=t,this.creationDate=e,this.hasChanges=r,this.errorDetails=i,this.clientData=n}}let he,le;try{le=$__ROX_EMBEDDED_CONTENT}catch(r){}if(le&&"string"==typeof le)try{le=JSON.parse(le)}catch(r){le=void 0}var pe=he=le&&le.constructor===Object&&le.signed_date?le:he;const fe=kt.CLIENT_DATA_CACHE_KEY;let de=!1;class ge{constructor(t,e,r){if(void 0===t||""===t)throw new Error("Custom property must be initialized with a name.");if(this._name=t,"function"==typeof r){if(1<r.length)throw new Error("Dynamic value of a custom property should be a function with maximum 1 argument");r.isDynamic=!0,this._value=r}else{if(r&&r.constructor!==e&&r.constructor!==Function)throw new Error(`Custom property initialized with an invalid type / value combination. (Type: ${e}, Value: ${r})`);this._value=()=>r}this._type=e}get type(){return this._type.name}get externalType(){return this._type.name}get name(){return this._name}getValue(t={}){if(this._value&&this._value.isDynamic)try{return this._value(t)}catch(t){throw t.isUserError=!0,t.trigger="CUSTOM_PROPERTY_GENERATOR",t}return this._value(t)}get value(){return this._value()}}const me=t=>{setTimeout(t,5)},ye=()=>{},ve="object"==typeof window&&window.EventSource;class _e{constructor(t,e,r,i){t=t+(t.endsWith("/")?"":"/")+e,h.info("Starting push notification listener to "+t),e={url:t,options:i},Rt.applyProxyToSseRequest(e),r?this.eventSource=new r(e.url,e.options):ve&&(this.eventSource=new ve(e.url))}on(t,e){this.eventSource&&this.eventSource.addEventListener(t,(t=>{try{e(t)}catch(t){}}))}stop(){this.eventSource&&this.eventSource.close()}}y=e(73);var be=e.n(y);function xe(t){return t.catch((t=>{throw t.message="Unable to send state!\n"+t.message,t}))}const we=new class{get customProperties(){const t=[];return m.items.forEach((e=>{t.push({name:e.name,type:e.type,externalType:e.externalType})})),t}get featureFlags(){const t=[];return f.items.forEach((e=>{t.push({name:e.name,defaultValue:e.defaultValue,options:e._options})})),t}};let Se={ClassRegister:class{constructor(t={}){this.options=Object.assign({},$t,t),this._flagsRepository=this.options.flagsRepository,this._namespaceStore=new Set}handleContainer(t,e){if("[object String]"!==Object.prototype.toString.call(t))throw new Error("InvalidNamespace: Namespace must be a string (non-nullable).");var r,i;if(this._namespaceStore.has(t))throw new Error(`InvalidNamespace: A namespace must be unique. A container with the given namespace ('${t}') has already been registered.`);this._namespaceStore.add(t);for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&(r=t?t+"."+n:n,(i=e[n])instanceof qt&&this._flagsRepository.addFlag(r,i))}}};const Oe=new class{constructor(t=5e3){this.classRegisterer=new Se.ClassRegister,this.sendStateDebounceNoCheck=be()((()=>{this._sendState()}),t,{maxWait:t,leading:!1,trailing:!0}),this.sendStateDebounced=()=>{this.appKey&&this.sendStateDebounceNoCheck()},this.onConfigurationFetched=this.onConfigurationFetched.bind(this)}get dynamicApi(){return this._dynamicApi}get appKey(){return this.app_key}setKey(t){if(!/^[a-f\d]{24}$/i.test(t))throw Error("invalid rollout apikey");this.app_key=t}setup(t={}){try{this.handleOptions(t),Se.DeviceProperties=Se.DeviceProperties.create?Se.DeviceProperties.create(Se):Se.DeviceProperties,this.app_release&&Se.DeviceProperties.setAppRelease(this.app_release),this.distinct_id&&Se.DeviceProperties.setDistinctId(this.distinct_id),this.platform&&Se.DeviceProperties.setPlatform(this.platform),this.deviceProperties=Se.DeviceProperties,Ft.init(this.appKey,Se.DeviceProperties,this.networkOptions,this.selfManagedMode),this.configurationFetcher=new class{constructor(t,e,r,i,n,s,o){this.cache=i.RoxCache,this.crypto=i.RoxCrypto,this.embdeddedJSON=this.fetchFromEmbedded(n),this.appKey=t,this.deviceProperties=e,this.devModeSecret=r,this.options=s||{},this.networkOptions=o,this.lastResponse=null}runHandler(t,e){if(e.errorDetails&&Ft.error("Configuration fetcher returned with "+e.fetcherStatus,e.errorDetails),t instanceof Function)try{t(e)}catch(t){}}dispatch({handler:t,options:e}){h.debug("dispatch();");const r=[];if(e.useCache){if(this.embdeddedJSON){if(!this.verifyPayload(this.embdeddedJSON))throw new Error("The embdeddedJSON was corrupted or its authenticity cannot be securely verified.");var i=this.parsePayload(this.embdeddedJSON);i&&r.push({payload:this.embdeddedJSON,parser:i,status:"APPLIED_FROM_EMBEDDED"})}if(i=this.fetchFromCache()){if(!this.verifyPayload(i))throw new Error("The cachedPayload was corrupted or its authenticity cannot be securely verified.");var n=this.parsePayload(i);n&&r.push({payload:i,parser:n,status:"APPLIED_FROM_CACHE"})}}if(0<r.length){const e=r.reduce(((t,e)=>t&&t.parser.signedDate()>e.parser.signedDate()?t:e),null);(!this.lastApplied||this.lastApplied.signedDate()<e.parser.signedDate())&&(this.lastResponse=e.payload,this.apply(e.parser,e.status,!1,t,e.payload))}if(!e.skipNetwork){if(!this.shouldSkipFetch(e.source))return this._dispatch({handler:t,storeInCache:!0});h.debug("Skipping fetch - kill switch")}}shouldSkipFetch(t){t="push"===t;var e=(e=Vt("rox.internal.throttleFetchInSeconds"),parseInt(e)||0);if(0<e&&(!t||Ut("rox.internal.considerThrottleInPush"))){if(t=+Date.now(),this.lastFetchTryTime&&t<this.lastFetchTryTime+1e3*e)return!0;this.lastFetchTryTime=t}return!1}dispatchPeriodically({handler:t,periodTimeInSec:e}){if(de)return h.debug("Dispatch Periodically already running"),Promise.resolve();de=!0,h.debug("Dispatch Periodically"),setInterval((()=>{this._dispatch({handler:t})}),1e3*e)}_dispatch({handler:t,storeInCache:e}){return this.fetchFromNetwork().then((r=>{var i=this.isNewResponse(r);return this.process(r,"APPLIED_FROM_NETWORK",i,t).then((()=>{e&&this.storeInCache(r),this.lastResponse=r}))})).catch((e=>{this.runHandler(t,new ce(ue,null,!1,e))}))}fetchFromNetwork(){h.debug("fetch from network for appKey "+this.appKey);var t,e,r,i,n=function({appKey:t,deviceProperties:e,devModeSecret:r}){const i=e.getProperties();var n;return i.app_key=t,i.buid=([e={},n=Xt]=[i],ee(e,n)),i.buid_generators_list=Xt.join(","),i.relative_url=t+"/"+i.buid,i.cache_url=""+kt.CD_S3_ENDPOINT+i.relative_url,i.devModeSecret=r,i}({appKey:this.appKey,deviceProperties:this.deviceProperties,devModeSecret:this.devModeSecret});return this.rc=n,this.options.roxyUrl?(i=this.options.roxyUrl,r=this.networkOptions,i={url:Jt(n,i).url,options:r},Rt.applyProxyToRequest(i),Qt(Nt().get(i.url,i.options).then(Gt))):([t,e,r={}]=[n,this.networkOptions,this.options],i=t.cache_url+"?distinct_id="+t.distinct_id,r.selfManagedMode&&!kt.CD_S3_ENDPOINT?Qt(Zt((n=Jt(t)).url,n.body,e)):(r={url:i,options:e},Rt.applyProxyToRequest(r),Qt(Nt().get(r.url,r.options).then((({data:t,status:e})=>{if(200===e&&t&&"object"==typeof t){if(404!==t.result)return h.debug("succeed fetch from CDN"),t;{h.debug("succeed fetch from CDN, but it was missing");const t=new Error("missing from CDN");return t.missing=!0,Promise.reject(t)}}})).catch((t=>{if(t.missing||t.response&&(404==t.response.status||403==t.response.status))return Promise.reject();h.debug("Unexpected error calling get configuration, status code returned different from 403 or 404. error: "+t)})).catch((()=>{var r=Jt(t);return Zt(r.url,r.body,e)})))))}fetchFromCache(){h.debug("fetch From Cache");let t,e=this.cache.get(this.cacheKey());if(e=e||this.cache.get(fe)){try{t=JSON.parse(e)}catch(e){h.warn(`Configuration retrieved from cache, but is corrupted. Aborting. (Error: ${e})`)}if(t&&t.constructor===Object)return h.debug("Parsed cached = "+JSON.stringify(t)),t}}cacheKey(){return fe+"-"+this.appKey}fetchFromEmbedded(t){let e;if(t){try{e=JSON.parse(t)}catch(t){h.warn("Received embdedded configuration, but it is corrupted. Aborting. Error: ",t)}if(e&&e.constructor===Object)return h.debug("Parsed embedded = "+JSON.stringify(e)),e}if(pe&&"object"==typeof pe)return pe}storeInCache(t){h.debug("Store in cache response = "+JSON.stringify(t)),this.cache.set(this.cacheKey(),JSON.stringify(t))}process(t,e,r,i){if(!t)return Promise.reject("Empty configuration");if(!this.verifyPayload(t))throw new Error("The payload has corrupted or its authenticity cannot be securely verified.");var n=this.parsePayload(t);return n?this.apply(n,e,r,i,t):Promise.reject("Failed to parse configuration")}apply(t,e,r,i,n){if(t)return this.calculatePayload(t),this.lastApplied=t,new Promise((s=>{var o=new ce(e,t.signedDate(),r,void 0,n);this.runHandler(i,o),s()}))}parsePayload(t){var e=!this.options.roxyUrl;const r=new ae(t,this.appKey,e);return r.parse()?r:(h.debug(`failed to parse payload. response = ${JSON.stringify(t)} deviceProps = ${this.deviceProperties} app_key = `+this.appKey),null)}verifyPayload(t){var{signature_v0:t,data:e}=t;return!(!this.options.roxyUrl&&!this.options.selfManagedMode)||this.crypto.verify(e,t)}calculatePayload(t){if(t)return g.setTargetGroups(t.targetGroups()),p.setExperiments(t.experiments()),new l(f,p).prepareFlagsWithExperiments(),t}isNewResponse(t){return JSON.stringify(this.lastResponse)!==JSON.stringify(t)}get cacheURL(){return this.rc&&this.rc.cache_url}}(this.appKey,this.deviceProperties,this.devModeSecret,Se,this.embeddedConfiguration,{roxyUrl:this.roxyUrl,selfManagedMode:this.selfManagedMode},this.networkOptions),this.roxyUrl||(this.stateSender=new class{constructor(t,e,r,i,n){this.appKey=t,this.deviceProperties=e,this.devModeSecret=r,this.networkOptions=i,this.options=n}send(){h.debug("check for cached state for appKey "+this.appKey);var t,e,r,i,n,s,o,a=this.buildSetState();try{[t,e,r={}]=[a,this.networkOptions,this.options],s=t,o=""+kt.SS_S3_ENDPOINT+s.app_key+"/"+s.md5,(r.selfManagedMode&&!kt.SS_S3_ENDPOINT?xe(Yt((i=Wt(t)).url,i.body,e)):(n={url:o,options:e},Rt.applyProxyToRequest(n),xe(Nt().get(n.url,n.options).then((({data:t,status:e})=>{if(200===e&&t&&"object"==typeof t){if(404===t.result){h.debug("succeed setState from CDN, but it was missing");const t=new Error("missing from CDN");return t.missing=!0,Promise.reject(t)}if(200===t.result)return void h.debug("succeed setState from CDN")}h.debug("succeed setState, but with unexpected response")})).catch((t=>{if(t.missing||t.response&&(404==t.response.status||403==t.response.status))return Promise.reject();h.debug("Unexpected error calling setState, status code returned different from 403 or 404. error: "+t)})).catch((()=>{var r=Wt(t);return Yt(r.url,r.body,e)}))))).catch((t=>{h.error("failed to send state (promise)",t)}))}catch(r){h.error("failed to send state",r)}}sortItemsByName(t){return t.sort(((t,e)=>t.name>e.name?-1:1))}buildSetState(){const t=this.deviceProperties.getProperties();var e,r;return t.app_key=this.appKey,t.feature_flags=this.sortItemsByName(we.featureFlags),t.custom_properties=this.sortItemsByName(we.customProperties),t.devModeSecret=this.devModeSecret,t.md5=([e={},r=te]=[t],ee(e,r)),t}}(this.appKey,this.deviceProperties,this.devModeSecret,this.networkOptions,{selfManagedMode:this.selfManagedMode}),this.disableNetwork||(e=new class{constructor(t,e,r,i){if(e=e||{},this.queue=[],this.writeKey=t,this.host=e.host||kt.ANALYTICS_ENDPOINT,this.timeout=e.timeout||!1,this.flushAt=Math.max(e.flushAt||20,1),this.flushInterval=e.flushInterval||1e4,this.flushed=!1,this.version=r.getProperties().lib_version||"0.0",void 0===r.getProperties().platform)throw new Error("Platform must be provided");this.platform=r.getProperties().platform||"",this.networkOptions=i,Object.defineProperty(this,"enable",{configurable:!1,writable:!1,enumerable:!0,value:"boolean"!=typeof e.enable||e.enable})}identify(t,e){return this.enqueue("identify",t,e),this}group(t,e){return this.enqueue("group",t,e),this}track(t,e){return this.enqueue("track",t,e),this}page(t,e){return this.enqueue("page",t,e),this}screen(t,e){return this.enqueue("screen",t,e),this}alias(t,e){return this.enqueue("alias",t,e),this}enqueue(t,e,r){return r=r||ye,this.enable?(e=Object.assign({},e),this.queue.push({message:e,callback:r}),this.flushed?(this.queue.length>=this.flushAt&&this.flush(),void(this.flushInterval&&!this.timer&&(this.timer=setTimeout(this.flush.bind(this),this.flushInterval)))):(this.flushed=!0,void this.flush())):me(r)}flush(t){if(t=t||ye,!this.enable)return me(t);if(this.timer&&(clearTimeout(this.timer),this.timer=null),!this.queue.length)return me(t);const e=this.queue.splice(0,this.flushAt),r=e.map((t=>t.callback));var i=e.map((t=>t.message));const n={analyticsVersion:"1.0.0",sdkVersion:this.version,time:(new Date).getTime(),platform:this.platform,rolloutKey:this.writeKey,events:i},s=e=>{r.forEach((t=>t(e))),t(e,n)},o=(i=this.host+"/impression/"+this.writeKey,{httpsAgent:this.networkOptions.httpsAgent,httpAgent:this.networkOptions.httpAgent});this.timeout&&(o.timeout=this.timeout),i={url:i,data:n,options:o},Rt.applyProxyToRequest(i),Nt().post(i.url,i.data,i.options).then((()=>s())).catch((t=>{var e;if(t.response)return e=new Error(t.response.statusText),s(e);s(t)}))}}(this.appKey,Object.assign({},this.analyticsOptions),Se.DeviceProperties,this.networkOptions),Lt=e)),Se.getDefaultCustomProperties(this.deviceProperties,this.appKey).map(m.setIfNotExists.bind(m))}catch(e){h.error(t="Oh uh! An error occured during setup.",e),Ft.error(t,e)}var e;return Promise.resolve(this)}handleOptions(t){const e=Object.assign({},Se.DefaultSetupOptions,t);if(e.selfManaged&&"object"==typeof e.selfManaged){if(!e.selfManaged.analyticsURL)throw new Error("analyticsURL is required on self managed mode");if(!e.selfManaged.serverURL)throw new Error("serverURL is required on self managed mode");t.selfManaged.configurationURL&&(e.selfManaged.configurationURL=t.selfManaged.configurationURL.endsWith("/")?t.selfManaged.configurationURL:t.selfManaged.configurationURL+"/"),t.selfManaged.stateURL&&(e.selfManaged.stateURL=t.selfManaged.stateURL.endsWith("/")?t.selfManaged.stateURL:t.selfManaged.stateURL+"/"),o=e.selfManaged,kt=Object.assign({},It(),(({analyticsURL:o,serverURL:s,pushUpdateURL:r,configurationURL:i,stateURL:n}=o),{CD_API_ENDPOINT:s+"/device/get_configuration",SS_API_ENDPOINT:s+"/device/update_state_store/",CLIENT_DATA_CACHE_KEY:"client_data",ANALYTICS_ENDPOINT:o,NOTIFICATIONS_ENDPOINT:r+"/sse",CD_S3_ENDPOINT:i,SS_S3_ENDPOINT:n})),Bt=!0,this.selfManagedMode=!0}var r,i,n,s,o;e.configuration&&e.configuration.disableNetwork&&(this.disableNetwork=!0),this.embeddedConfiguration=e.embedded,this.fetchIntervalInSec=e.fetchIntervalInSec,this.disablePushUpdateListener=!!(this.disableNetwork||this.selfManagedMode&&!e.selfManaged.pushUpdateURL)||e.disablePushUpdateListener,this.configurationFetchedHandler=e.configurationFetchedHandler,this.impressionHandler=e.impressionHandler,this.dynamicPropertyRuleHandler=e.dynamicPropertyRuleHandler,this.app_release=e.version,this.distinct_id=e.distinctId,this.devModeSecret=e.devModeSecret,this.platform=e.platform,this.roxyUrl=e.roxy,this.networkOptions={httpAgent:e.httpAgent,httpsAgent:e.httpsAgent},this.analyticsOptions=e.analytics,this.eventSourceImpl=e.eventSourceImpl,s=this.impressionHandler,zt=s,t.logger&&h.setLogger(t.logger),this.dynamicPropertyRuleHandler&&(o=this.dynamicPropertyRuleHandler,(U=o)&&(U._isUserDefined=!0))}fetchPeriodically(){if(!this.app_key)return h.warn("no app key"),Promise.reject();if(this.fetchIntervalInSec<=0)return Promise.resolve();this.fetchIntervalInSec<30&&(this.fetchIntervalInSec=30);var t=this._fetch({useCache:!1});return this.configurationFetcher.dispatchPeriodically({handler:this.onConfigurationFetched,periodTimeInSec:this.fetchIntervalInSec}),t}fetchCacheOnly(){return this._fetch({useCache:!0,skipNetwork:!0})}fetchWithCacheAndProceed(){return this._fetch({useCache:!0})}fetch(){return this._fetch({useCache:!1})}_fetchFromPush(){return this._fetch({useCache:!1,source:"push"})}sendState(){this._sendState()}_sendState(){this.sendStateDebounceNoCheck.cancel(),this.app_key&&(this.disableNetwork?h.debug("send state - disabled network"):this.stateSender&&this.stateSender.send())}_fetch(t={}){if(this.app_key){if(this.configurationFetcher)return this.disableNetwork&&(h.debug("fetch - disabling network"),t.skipNetwork=!0),this.configurationFetcher.dispatch({handler:this.onConfigurationFetched,options:t})}else h.warn("no app key")}register(t,e){void 0===e&&"object"==typeof t&&null!==t&&(e=t,t=""),h.debug(`Registering container '${t}' = `+JSON.stringify(e)),this.classRegisterer.handleContainer(t,e),this.sendStateDebounced()}setCustomProperty(t,e,r){t=new ge(t,e,r),e=!m.has(t),m.set(t),e&&this.sendStateDebounced()}unfreeze(t,e){f.flags.filter((e=>{if(!e.name||"string"!=typeof t)return!0;const r=e.name.split(".");return 1===r.length&&""===t||r.slice(0,r.length-1).join(".")===t})).forEach((t=>{t.unfreeze(e)}))}get metadata(){const t=new Mt;return{targetGroups:g.targetGroups.map((e=>({name:e.name,isEnabled:t.evaluateExpression(e.condition)}))),experiments:p.experiments.map((e=>({name:e.name,isEnabled:"true"===t.evaluateExpression(e.deploymentConfiguration.condition)}))),flags:f.flags.map((t=>({name:t.name,value:t._peek()})))}}onConfigurationFetched(t){try{t.fetcherStatus!==ue&&this.startOrStopPushUpdatesListener()}catch(t){h.warn("Cound not start or stop push notification listener. exception: "+t)}if(this.configurationFetchedHandler instanceof Function)try{return this.configurationFetchedHandler(t)}catch(t){V.invoke("CONFIGURATION_FETCHED_HANDLER",t)}}startOrStopPushUpdatesListener(){!this.disablePushUpdateListener&&Ut("rox.internal.pushUpdates")?this.app_key&&!this.pushUpdatesListener&&(this.pushUpdatesListener=new _e(kt.NOTIFICATIONS_ENDPOINT,this.app_key,this.eventSourceImpl,this.networkOptions),this.pushUpdatesListener.on("changed",(()=>{this._fetchFromPush()}))):this.pushUpdatesListener&&(this.pushUpdatesListener.stop(),this.pushUpdatesListener=null)}setUserspaceUnhandledErrorHandler(t){V.setHandler(t)}get cacheURL(){if(this.configurationFetcher&&this.configurationFetcher.cacheURL)return this.configurationFetcher.cacheURL;throw new Error("Rox was not initialized. Please call setup() before calling cacheURL()")}};b=e(737);var Te=e.n(b),Ee=new class{set(t,e,r){Te().set(t,e,r)}get(t){return Te().get(t)}};_=e(953);const{api_version:Ne,lib_version:Ae}={api_version:"1.9.0",lib_version:"5.4.2"};y=new class extends class{constructor(t,e){this.cache=t,this._uuid=e,this.distinct_id=this.generateDistinctId(),this.app_release="0.0",this.distinctIdSetExplicitly=!1}setPlatform(t){this.platform=t}setDistinctId(t){this.distinctIdSetExplicitly=!0,this.distinct_id=t}setAppRelease(t){this.app_release=t}uuid(){return this._uuid()}generateDistinctId(){let t=this.cache.get("distinctId");return t||(t=this.uuid(),this.cache.set("distinctId",t)),t}}{getProperties(){var{distinct_id:t,app_release:e,platform:r}=this;return Object.assign({app_release:e,api_version:Ne,lib_version:Ae,distinct_id:t,platform:r,customSigningCertificate:"5659eb0ca47811395ef85f0b09be63b7",language:navigator.language,anticache:+Date.now()},"undefined"==typeof window?{}:{screen_width:window.screen.width,screen_height:window.screen.height})}}(Ee,e.n(_)());class Pe extends ge{get name(){return"rox."+super.name}}const De=r.CustomProperty;b=e(345);var Ce=e.n(b),Re=(_=e(93),e.n(_));b=new class{constructor(){this.verifier=new(Ce())(void 0),this.verifier.getKey().setPublic("eaf0631114bc9a4150c475c1e5626ecd9c6ac0aa12cfd84ff6ed6db5c9341e8a7eebf05393ffb8c9d0f2e97062f0ff7cc34f9c33209dceb45cb81d6adeda19fbc26b7e6c8f9b6d2ffd90aae6aa4a63023d7e3f09c1e2584469ddbb96894c0aecf9a6eaea8b6d3d93bab9d4831d7ead3f3adecffc19a9f8b04db361788ccb0f6316545189154c098faa09f0c6e5a82596a7fce18d8ed8fd38683c78e70e7dccb10b818347f61a8a5fa486de08fc71deb125d5ba4a979edb1b7609d7285917ebcd93b853dcde977c972fba37a3925a96cd57c526115672827c564f7bf1053d935af15ec5b5b9d8a38563dd702248edf883c430f2413cf0e237d2769eeb6dbdf329","10001")}verify(t,e){return this.verifier.verify(t,e,Re())}};let Ie={};function ke(t){Ie=t}const Fe={freezeOptionNone:"none",freezeOptionUntilLaunch:"untilLaunch"};let Me=null;function Be(t){return Object.keys(Fe).find((function(e){return Fe[e]===t}))}const je=Fe.freezeOptionNone,Ue="roxOverrideValues";let Ve=Ee.get(Ue);function ze(t){Ee.set(Ue,JSON.stringify(t))}function Le(t=null){return void 0!==t&&void 0!==Ve[t]}function He(t=null){if(t)return Ve[t];throw new Error("Missing name")}function Ke(t,e){if(!t)throw new Error("Missing name");Ve[t]=e,ze(Ve)}function qe(t){if(!t)throw new Error("Missing name");Ve[t]=void 0,delete Ve[t],ze(Ve)}function $e(){ze(Ve={})}function Je(t){if(!t)throw new Error("Missing name");const e=f.flagWithName(t);return e?e._originalValue():null}Ve=Ve?JSON.parse(Ve):{};const{CallContextTypes:We,FlagTypes:Ge}=r,Ze=new(0,i.RoxxParser);class Ye extends qt{constructor(t,e,{freeze:r}={},i=Ge.string){if(super(t,e,i),r&&!Be(r))throw new Error("Freeze option is invalid "+r);this._localFreeze=r,this._lastResultExplanation={}}unfreeze(){this._frozen=!1}setLastResultToExperiment(t,e){this._lastResultExplanation={value:t,from:"experiment",payload:{condition:this.condition,expressionEvaluation:e}}}setLastResultToDefault(t){this.condition?this._lastResultExplanation={value:t,from:"exception",payload:{condition:this.condition}}:this._lastResultExplanation={value:t,from:"default"}}setLastResultToFreeze(){this._lastResultExplanation={value:this._value,from:"freeze",payload:{freezedBy:"freeze"===this._lastResultExplanation.from?this._lastResultExplanation.payload.freezedBy:this._lastResultExplanation}}}calculateCondition(t,e){const r={isExperimenting:!1,value:null!=t.alternativeDefaultValue?t.alternativeDefaultValue:this._defaultValue,usedContext:e};var i=[];if(this.condition){var n=Ie;e=e?Object.assign({},n,e):Object.assign({},n),r.usedContext=e;let s=Ze.evaluateExpression(this.condition,t,e,i);void 0!==(s=s&&s.toString?s.toString():s)&&(r.isExperimenting=!0,r.value=s)}t.isPeek||(r.isExperimenting?this.setLastResultToExperiment(r.value,i):this.setLastResultToDefault(r.value)),t.result=r}getOneTimeValue(t,e){this.calculateCondition(t,e)}getFreezedValue(t){t.isPeek||this.setLastResultToFreeze(),t.result={value:this._value,isFreezed:!0,isExperimenting:this._isExperimenting}}getActiveValue(t,e){if(this._freeze!==Fe.freezeOptionNone)return t.type===We.frozenOrCalc?this._frozen?void this.getFreezedValue(t):void this.getOneTimeValue(t,e):t.type!==We.oneTimeCalc?t.type&&t.type!==We.default||this._frozen?void this.getFreezedValue(t):(this.calculateCondition(t,e),this.setValue(t.result),this._frozen=!0,t.result.isExperimenting=this._isExperimenting,void(t.result.value=this._value)):void this.getOneTimeValue(t,e);this.getOneTimeValue(t,e)}getInternalValue(t,e){var r=this.overridenValue;if(r)return t.result={isExperimenting:!0,isOverride:!0,usedContext:e,value:r},void(this._lastResultExplanation={value:r,from:"override"});this.getActiveValue(t,e)}getValue(t){var e={result:void 0,isOverride:void 0};return this.getInternalValue(e,t),e.result.isFreezed||e.isOverride||this._flagImpression(e.result.value,t),e.result.value}setValue(t){this._frozen||(this._isExperimenting=t.isExperimenting,this._value=t.value)}explainLastResult(){return this._lastResultExplanation}peek(t){var e={isPeek:!0,type:We.oneTimeCalc,result:void 0};return this.getInternalValue(e,t),e.result.value}get _freeze(){return this._localFreeze||Me||je}get overrider(){return s}}const{FlagTypes:Qe,RoxStringBase:Xe}=r;class tr extends Ye{constructor(t,e,r){super(t,e,r,Qe.number)}getValue(t){var e={};this.getInternalValue(e,t);const r=Xe._normalizeNumber(e.result.value);return e.result.isOverride||e.result.isFreezed||this._flagImpression(r.toString(),e.result.usedContext),r}}class er extends Ye{constructor(t=!1,e){super(t,[!1,!0],e,Kt.boolean)}isEnabled(t){var e={result:void 0};this.getInternalValue(e,t);const r=qt._normalizeBoolean(e.result.value);return e.result.isOverride||e.result.isFreezed||this._flagImpression(r.toString(),e.result.usedContext),r}}_=new class{createFlag(t){return new er(t)}createString(t,e){return new Ye(t,e)}createNumber(t,e){return new tr(t,e)}};var rr=(i={DeviceProperties:y,getDefaultCustomProperties:function(t,e){return t=t.getProperties(),[new De("rox.app_release",String,t.app_release),new De("rox.platform",String,t.platform),new De("rox.screen_width",Number,t.screen_width),new De("rox.screen_height",Number,t.screen_height),new De("rox.language",String,t.language),new De("rox.distinct_id",String,t.distinct_id),new De("rox.internal.realPlatform",String,"Browser"),new De("rox.internal.customPlatform",String,t.platform),new De("rox.internal.appKey",String,e),new De("rox.internal.distinct_id",String,t.distinct_id)]},DefaultSetupOptions:{distinctId:null,version:"0",configurationFetchedHandler:function(){},impressionHandler:null,devModeSecret:null,platform:"Browser",analytics:{flushAt:20,flushInterval:1e3}},RoxCache:Ee,RoxCrypto:b,EntitiesProvider:_},Se=Object.assign({},Se,i),Oe._dynamicApi=new class{constructor(t,e,r){this.entityProvider=t,this.flagRepository=e,this.client=r}genericValue(t,e,r,i,n=Kt.string,s=this.entityProvider.createString,o=qt._normalizeString){if("string"!=typeof t)throw new Error("DynamicApi error - name must be a string");if(typeof e!==n)throw new Error(`DynamicApi default value must be of ${n} type. Received '${e}'`);let a=this.flagRepository.flagWithName(t);a||(a=s(e,r),this.flagRepository.addFlag(t,a),this.client.sendStateDebounced()),n={alternativeDefaultValue:e.toString()},a.getInternalValue(n,i);const u=o(n.result.value);return n.result.isFreezed||n.result.isOverride||a._flagImpression(u.toString(),n.result.usedContext),u}isEnabled(t,e,r){return this.genericValue(t,e,null,r,Kt.boolean,this.entityProvider.createFlag,qt._normalizeBoolean)}value(t,e,r,i){return Array.isArray(r)||(i=r,r=null),this.genericValue(t,e,r,i)}getNumber(t,e,r,i){return Array.isArray(r)||(i=r,r=null),this.genericValue(t,e,r,i,Kt.number,this.entityProvider.createNumber,qt._normalizeNumber)}}(i.EntitiesProvider,f,Oe),Oe);function ir(...t){const e=t;return function(t){for(let r=e.length-1;-1<r;r--)t=e[r].call(this,t);return t}}const nr=(t={})=>Object.keys(t).map((e=>e+": "+t[e])).join(";"),sr=t=>e=>(e.setAttribute("class",t),e),or=(t,e,r)=>(t.addEventListener(e,r),t),ar=(t,e)=>or(t,"click",e);let ur,cr,hr,lr,pr,fr;ur=cr=hr=lr=pr,fr=()=>{},"undefined"!=typeof window&&"undefined"!=typeof document&&(ur=(t,e=[])=>e.reduce(((t,e)=>(!e||t.appendChild(e))&&t),t),cr=(t="div",e="")=>{const r=document.createElement(t);return r.textContent=e,r},hr=(t="div",e={})=>{const r=document.createElement(t);return Object.keys(e).forEach((t=>r.setAttribute(t,e[t]))),r},lr=(t="div",e=[])=>ur(document.createElement(t),e),pr=cr.bind(document,"div"),fr=(t=[])=>lr("div",t));const dr=o.Flags;let gr,mr,yr,vr;const _r="bottom right",br={"top left":{top:0,left:0},"top right":{top:0,right:0},"bottom left":{bottom:0,left:0},"bottom right":{bottom:0,right:0}},xr={background:"white","z-index":999999,position:"fixed",width:"400px",height:"600px",overflow:"auto"},wr=({value:t,text:e,selected:r})=>{const i=document.createElement("option");return r&&i.setAttribute("selected",!0),i.setAttribute("value",t),i.textContent=e,i},Sr=({originalValue:t,overridingValue:e,option:r})=>e?e===r:t===r,Or=t=>{if(t.type===Kt.boolean)return[{options:e,originalValue:n,overridingValue:s}={options:[]}]=[t],e.map((t=>({text:t===n?`Original (${t})`:t,value:t,selected:Sr({originalValue:n,overridingValue:s,option:t})})));{var[{options:e,originalValue:r,overridingValue:i}={options:[]}]=[t];const n=e.map((t=>({text:t===r?`Original (${t})`:t,value:t,selected:Sr({originalValue:r,overridingValue:i,option:t})})));return n.find((t=>t.value===i))||"string"==typeof i&&n.push({text:i,value:i,selected:Sr({originalValue:r,overridingValue:i,option:i})}),n.find((t=>t.value===r))||"string"==typeof r&&n.push({text:`Original (${r})`,value:r,selected:Sr({originalValue:r,overridingValue:i,option:r})}),n.push({text:"Add New Value...",value:"freeText"}),n}var n,s},Tr=t=>((t,e="")=>(t.setAttribute("style",e),t))(t,nr(xr)+";"+nr(br[mr])),Er=({name:t,originalValue:e,overridingValue:r})=>fr([pr(t),r?ir(sr("roxFlagSub"),pr)("Original value: "+e):void 0]),Nr=t=>{var{name:e,nameDetails:r,originalValue:i,overridingValue:n}=t;return ir(sr("roxPushAside roxFlag"),fr)([Er({name:r.name,originalValue:i,overridingValue:n}),Dr(e,i,Or(t))])},Ar=({target:t,keyCode:e})=>{yr=27===e?(t.value="",null):t.value,Rr()},Pr=()=>($e(),Rr()),Dr=(t,e,r=[])=>((t,e)=>or(t,"change",e))(lr("select",r.map(wr)),((t,e)=>r=>{var i="freeText"===(i=r.target.value)?prompt("Please enter a custom value","value"):i;r.preventDefault(),e===i?qe(t):Ke(t,i),Rr()})(t,e)),Cr=()=>ir(sr("roxFlags"),fr)((t=>Object.keys(t).map(((t,e)=>fr([ir(sr("roxNamespace"),pr)(e),ir(sr("roxFlagsList"),fr)(t[e].map(Nr))])).bind(null,t)))(dr.items.map((t=>t.dump())).filter((t=>!yr||-1!==t.name.toLowerCase().indexOf(yr.toLowerCase()))).reduce(((t,e)=>(t[e.nameDetails.namespace]||(t[e.nameDetails.namespace]=[]),t[e.nameDetails.namespace].push(e),t)),{})));function Rr(){gr.removeChild(vr),vr=Cr(),gr.appendChild(vr)}function Ir(t=_r){if(!gr){-1===Object.keys(br).indexOf(t)&&(t=_r),mr=t,vr=Cr(),gr=ir(sr("roxDbg"),Tr,fr)([fr([ir(sr("roxPushAside roxTitle"),fr)([cr("span","ROX Overrides"),ar(cr("a","╳"),kr)]),ir(sr("roxSearch roxPushAside"),fr)([(t=hr("input",{placeholder:"Search Flags"}),e=Ar,or(t,"keyup",e)),ar(cr("a","Reset All Overrides"),Pr)])]),vr]);const r=document.getElementsByTagName("body")[0];r.appendChild(hr("link",{href:"https://fonts.googleapis.com/css?family=Lato",rel:"stylesheet"})),r.appendChild(hr("link",{href:"https://connect.rollout.io/rox.browser.css",rel:"stylesheet"})),r.appendChild(gr),Rr()}var e}function kr(){document.getElementsByTagName("body")[0].removeChild(gr),gr=void 0}var Fr=new class{constructor(){this.RoxString=Ye,this.RoxNumber=tr,this.setContext=ke,this.Flag=er,this.showOverrides=Ir,this.overrides=s}setup(t,e={}){if(h.setVerboseMode(e.debugLevel),e.configuration?(r=e.configuration,kt=Object.assign({},r)):e.hosting&&"eu"===e.hosting&&(kt=Object.assign({},It("eu-"))),e.proxy&&(r=e.proxy,Rt=new Dt(r)),e.freeze){if(!Be(r=e.freeze))throw new Error("Invalid freeze option: "+r);Me=r}var r;return rr.setKey(t),rr.setup(e),rr.sendState(),e.disableNetworkFetch?rr.fetchCacheOnly():rr.fetchWithCacheAndProceed()}fetch(){rr&&rr.fetch()}setCustomStringProperty(t,e){rr.setCustomProperty(t,String,e)}setCustomNumberProperty(t,e){rr.setCustomProperty(t,Number,e)}setCustomBooleanProperty(t,e){rr.setCustomProperty(t,Boolean,e)}register(t,e){rr.register(t,e)}unfreeze(t){rr.unfreeze(t)}get flags(){return f.flags}get dynamicApi(){return rr.dynamicApi}setUserspaceUnhandledErrorHandler(t){rr.setUserspaceUnhandledErrorHandler(t)}}}(),n.default;function e(t){var n=i[t];return void 0===n&&(n=i[t]={exports:{}},r[t].call(n.exports,n,n.exports,e)),n.exports}var r,i,n}));

}).call(this)}).call(this,require("buffer").Buffer)
},{"axios":6,"buffer":2}]},{},[5]);
