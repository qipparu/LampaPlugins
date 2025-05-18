function _slicedToArray(r, e) {
	return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}

function _nonIterableRest() {
	throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

function _unsupportedIterableToArray(r, a) {
	if (r) {
		if ("string" == typeof r) return _arrayLikeToArray(r, a);
		var t = {}.toString.call(r).slice(8, -1);
		return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
	}
}

function _arrayLikeToArray(r, a) {
	(null == a || a > r.length) && (a = r.length);
	for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
	return n;
}

function _iterableToArrayLimit(r, l) {
	var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
	if (null != t) {
		var e, n, i, u, a = [],
			f = !0,
			o = !1;
		try {
			if (i = (t = t.call(r)).next, 0 === l) {
				if (Object(t) !== t) return;
				f = !1;
			} else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
		} catch (r) {
			o = !0, n = r;
		} finally {
			try {
				if (!f && null != t.
				return &&(u = t.
				return (), Object(u) !== u)) return;
			} finally {
				if (o) throw n;
			}
		}
		return a;
	}
}

function _arrayWithHoles(r) {
	if (Array.isArray(r)) return r;
}

function _regeneratorRuntime() {
	"use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */
	_regeneratorRuntime = function _regeneratorRuntime() {
		return e;
	};
	var t, e = {}, r = Object.prototype,
		n = r.hasOwnProperty,
		o = Object.defineProperty || function(t, e, r) {
			t[e] = r.value;
		}, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator",
		c = i.asyncIterator || "@@asyncIterator",
		u = i.toStringTag || "@@toStringTag";

	function define(t, e, r) {
		return Object.defineProperty(t, e, {
			value: r,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}), t[e];
	}
	try {
		define({}, "");
	} catch (t) {
		define = function define(t, e, r) {
			return t[e] = r;
		};
	}
	function wrap(t, e, r, n) {
		var i = e && e.prototype instanceof Generator ? e : Generator,
			a = Object.create(i.prototype),
			c = new Context(n || []);
		return o(a, "_invoke", {
			value: makeInvokeMethod(t, r, c)
		}), a;
	}
	function tryCatch(t, e, r) {
		try {
			return {
				type: "normal",
				arg: t.call(e, r)
			};
		} catch (t) {
			return {
				type: "throw",
				arg: t
			};
		}
	}
	e.wrap = wrap;
	var h = "suspendedStart",
		l = "suspendedYield",
		f = "executing",
		s = "completed",
		y = {};

	function Generator() {}
	function GeneratorFunction() {}
	function GeneratorFunctionPrototype() {}
	var p = {};
	define(p, a, function() {
		return this;
	});
	var d = Object.getPrototypeOf,
		v = d && d(d(values([])));
	v && v !== r && n.call(v, a) && (p = v);
	var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p);

	function defineIteratorMethods(t) {
		["next", "throw", "return"].forEach(function(e) {
			define(t, e, function(t) {
				return this._invoke(e, t);
			});
		});
	}
	function AsyncIterator(t, e) {
		function invoke(r, o, i, a) {
			var c = tryCatch(t[r], t, o);
			if ("throw" !== c.type) {
				var u = c.arg,
					h = u.value;
				return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function(t) {
					invoke("next", t, i, a);
				}, function(t) {
					invoke("throw", t, i, a);
				}) : e.resolve(h).then(function(t) {
					u.value = t, i(u);
				}, function(t) {
					return invoke("throw", t, i, a);
				});
			}
			a(c.arg);
		}
		var r;
		o(this, "_invoke", {
			value: function value(t, n) {
				function callInvokeWithMethodAndArg() {
					return new e(function(e, r) {
						invoke(t, n, e, r);
					});
				}
				return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
			}
		});
	}
	function makeInvokeMethod(e, r, n) {
		var o = h;
		return function(i, a) {
			if (o === f) throw Error("Generator is already running");
			if (o === s) {
				if ("throw" === i) throw a;
				return {
					value: t,
					done: !0
				};
			}
			for (n.method = i, n.arg = a;;) {
				var c = n.delegate;
				if (c) {
					var u = maybeInvokeDelegate(c, n);
					if (u) {
						if (u === y) continue;
						return u;
					}
				}
				if ("next" === n.method) n.sent = n._sent = n.arg;
				else if ("throw" === n.method) {
					if (o === h) throw o = s, n.arg;
					n.dispatchException(n.arg);
				} else "return" === n.method && n.abrupt("return", n.arg);
				o = f;
				var p = tryCatch(e, r, n);
				if ("normal" === p.type) {
					if (o = n.done ? s : l, p.arg === y) continue;
					return {
						value: p.arg,
						done: n.done
					};
				}
				"throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg);
			}
		};
	}
	function maybeInvokeDelegate(e, r) {
		var n = r.method,
			o = e.iterator[n];
		if (o === t) return r.delegate = null, "throw" === n && e.iterator.
		return &&(r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y;
		var i = tryCatch(o, e.iterator, r.arg);
		if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y;
		var a = i.arg;
		return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y);
	}
	function pushTryEntry(t) {
		var e = {
			tryLoc: t[0]
		};
		1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e);
	}
	function resetTryEntry(t) {
		var e = t.completion || {};
		e.type = "normal", delete e.arg, t.completion = e;
	}
	function Context(t) {
		this.tryEntries = [{
			tryLoc: "root"
		}], t.forEach(pushTryEntry, this), this.reset(!0);
	}
	function values(e) {
		if (e || "" === e) {
			var r = e[a];
			if (r) return r.call(e);
			if ("function" == typeof e.next) return e;
			if (!isNaN(e.length)) {
				var o = -1,
					i = function next() {
						for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next;
						return next.value = t, next.done = !0, next;
					};
				return i.next = i;
			}
		}
		throw new TypeError(_typeof(e) + " is not iterable");
	}
	return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", {
		value: GeneratorFunctionPrototype,
		configurable: !0
	}), o(GeneratorFunctionPrototype, "constructor", {
		value: GeneratorFunction,
		configurable: !0
	}), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function(t) {
		var e = "function" == typeof t && t.constructor;
		return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name));
	}, e.mark = function(t) {
		return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t;
	}, e.awrap = function(t) {
		return {
			__await: t
		};
	}, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function() {
		return this;
	}), e.AsyncIterator = AsyncIterator, e.async = function(t, r, n, o, i) {
		void 0 === i && (i = Promise);
		var a = new AsyncIterator(wrap(t, r, n, o), i);
		return e.isGeneratorFunction(r) ? a : a.next().then(function(t) {
			return t.done ? t.value : a.next();
		});
	}, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function() {
		return this;
	}), define(g, "toString", function() {
		return "[object Generator]";
	}), e.keys = function(t) {
		var e = Object(t),
			r = [];
		for (var n in e) r.push(n);
		return r.reverse(),
		function next() {
			for (; r.length;) {
				var t = r.pop();
				if (t in e) return next.value = t, next.done = !1, next;
			}
			return next.done = !0, next;
		};
	}, e.values = values, Context.prototype = {
		constructor: Context,
		reset: function reset(e) {
			if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t);
		},
		stop: function stop() {
			this.done = !0;
			var t = this.tryEntries[0].completion;
			if ("throw" === t.type) throw t.arg;
			return this.rval;
		},
		dispatchException: function dispatchException(e) {
			if (this.done) throw e;
			var r = this;

			function handle(n, o) {
				return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !! o;
			}
			for (var o = this.tryEntries.length - 1; o >= 0; --o) {
				var i = this.tryEntries[o],
					a = i.completion;
				if ("root" === i.tryLoc) return handle("end");
				if (i.tryLoc <= this.prev) {
					var c = n.call(i, "catchLoc"),
						u = n.call(i, "finallyLoc");
					if (c && u) {
						if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
						if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
					} else if (c) {
						if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
					} else {
						if (!u) throw Error("try statement without catch or finally");
						if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
					}
				}
			}
		},
		abrupt: function abrupt(t, e) {
			for (var r = this.tryEntries.length - 1; r >= 0; --r) {
				var o = this.tryEntries[r];
				if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
					var i = o;
					break;
				}
			}
			i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
			var a = i ? i.completion : {};
			return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a);
		},
		complete: function complete(t, e) {
			if ("throw" === t.type) throw t.arg;
			return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y;
		},
		finish: function finish(t) {
			for (var e = this.tryEntries.length - 1; e >= 0; --e) {
				var r = this.tryEntries[e];
				if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y;
			}
		},
		catch: function _catch(t) {
			for (var e = this.tryEntries.length - 1; e >= 0; --e) {
				var r = this.tryEntries[e];
				if (r.tryLoc === t) {
					var n = r.completion;
					if ("throw" === n.type) {
						var o = n.arg;
						resetTryEntry(r);
					}
					return o;
				}
			}
			throw Error("illegal catch attempt");
		},
		delegateYield: function delegateYield(e, r, n) {
			return this.delegate = {
				iterator: values(e),
				resultName: r,
				nextLoc: n
			}, "next" === this.method && (this.arg = t), y;
		}
	}, e;
}

function asyncGeneratorStep(n, t, e, r, o, a, c) {
	try {
		var i = n[a](c),
			u = i.value;
	} catch (n) {
		return void e(n);
	}
	i.done ? t(u) : Promise.resolve(u).then(r, o);
}

function _asyncToGenerator(n) {
	return function() {
		var t = this,
			e = arguments;
		return new Promise(function(r, o) {
			var a = n.apply(t, e);

			function _next(n) {
				asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
			}
			function _throw(n) {
				asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
			}
			_next(void 0);
		});
	};
}

function _defineProperty(e, r, t) {
	return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}

function _classCallCheck(a, n) {
	if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}

function _defineProperties(e, r) {
	for (var t = 0; t < r.length; t++) {
		var o = r[t];
		o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
	}
}

function _createClass(e, r, t) {
	return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
		writable: !1
	}), e;
}

function _toPropertyKey(t) {
	var i = _toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}

function _toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}

function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
/**
 * Minified by jsDelivr using Terser v5.19.2.
 * Original file: /npm/url-search-params-polyfill@8.2.5/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
/**!
 * url-search-params-polyfill
 *
 * @author Jerry Bendy (https://github.com/jerrybendy)
 * @licence MIT
 */! function(t) {
	"use strict";

	var n,
	r = function() {
		try {
			if (t.URLSearchParams && "bar" === new t.URLSearchParams("foo=bar").get("foo")) return t.URLSearchParams;
		} catch (t) {}
		return null;
	}(),
		e = r && "a=1" === new r({
			a: 1
		}).toString(),
		o = r && "+" === new r("s=%2B").get("s"),
		i = r && "size" in r.prototype,
		a = "__URLSearchParams__",
		c = !r || ((n = new r()).append("s", " &"), "s=+%26" === n.toString()),
		s = p.prototype,
		u = !(!t.Symbol || !t.Symbol.iterator);
	if (!(r && e && o && c && i)) {
		s.append = function(t, n) {
			d(this[a], t, n);
		}, s.delete = function(t) {
			delete this[a][t];
		}, s.get = function(t) {
			var n = this[a];
			return this.has(t) ? n[t][0] : null;
		}, s.getAll = function(t) {
			var n = this[a];
			return this.has(t) ? n[t].slice(0) : [];
		}, s.has = function(t) {
			return b(this[a], t);
		}, s.set = function(t, n) {
			this[a][t] = ["" + n];
		}, s.toString = function() {
			var t,
			n,
			r,
			e,
			o = this[a],
				i = [];
			for (n in o) for (r = g(n), t = 0, e = o[n]; t < e.length; t++) i.push(r + "=" + g(e[t]));
			return i.join("&");
		};
		var f,
		h = t.Proxy && r && (!o || !c || !e || !i);
		h ? (f = new Proxy(r, {
			construct: function construct(t, n) {
				return new t(new p(n[0]).toString());
			}
		})).toString = Function.prototype.toString.bind(p) : f = p, Object.defineProperty(t, "URLSearchParams", {
			value: f
		});
		var l = t.URLSearchParams.prototype;
		l.polyfill = !0, !h && t.Symbol && (l[t.Symbol.toStringTag] = "URLSearchParams"), "forEach" in l || (l.forEach = function(t, n) {
			var r = v(this.toString());
			Object.getOwnPropertyNames(r).forEach(function(e) {
				r[e].forEach(function(r) {
					t.call(n, r, e, this);
				}, this);
			}, this);
		}), "sort" in l || (l.sort = function() {
			var t,
			n,
			r,
			e = v(this.toString()),
				o = [];
			for (t in e) o.push(t);
			for (o.sort(), n = 0; n < o.length; n++) this.delete(o[n]);
			for (n = 0; n < o.length; n++) {
				var i = o[n],
					a = e[i];
				for (r = 0; r < a.length; r++) this.append(i, a[r]);
			}
		}), "keys" in l || (l.keys = function() {
			var t = [];
			return this.forEach(function(n, r) {
				t.push(r);
			}), S(t);
		}), "values" in l || (l.values = function() {
			var t = [];
			return this.forEach(function(n) {
				t.push(n);
			}), S(t);
		}), "entries" in l || (l.entries = function() {
			var t = [];
			return this.forEach(function(n, r) {
				t.push([r, n]);
			}), S(t);
		}), u && (l[t.Symbol.iterator] = l[t.Symbol.iterator] || l.entries), "size" in l || Object.defineProperty(l, "size", {
			get: function get() {
				var t = v(this.toString());
				if (l === this) throw new TypeError("Illegal invocation at URLSearchParams.invokeGetter");
				return Object.keys(t).reduce(function(n, r) {
					return n + t[r].length;
				}, 0);
			}
		});
	}

	function p(t) {
		((t = t || "") instanceof URLSearchParams || t instanceof p) && (t = t.toString()), this[a] = v(t);
	}

	function g(t) {
		var n = {
			"!": "%21",
			"'": "%27",
			"(": "%28",
			")": "%29",
			"~": "%7E",
			"%20": "+",
			"%00": "\0"
		};
		return encodeURIComponent(t).replace(/[!'\(\)~]|%20|%00/g, function(t) {
			return n[t];
		});
	}

	function y(t) {
		return t.replace(/[ +]/g, "%20").replace(/(%[a-f0-9]{2})+/gi, function(t) {
			return decodeURIComponent(t);
		});
	}

	function S(n) {
		var r = {
			next: function next() {
				var t = n.shift();
				return {
					done: void 0 === t,
					value: t
				};
			}
		};
		return u && (r[t.Symbol.iterator] = function() {
			return r;
		}), r;
	}

	function v(t) {
		var n = {};
		if ("object" == _typeof(t)) {
			if (m(t)) for (var r = 0; r < t.length; r++) {
				var e = t[r];
				if (!m(e) || 2 !== e.length) throw new TypeError("Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements");
				d(n, e[0], e[1]);
			} else for (var o in t) t.hasOwnProperty(o) && d(n, o, t[o]);
		} else {
			0 === t.indexOf("?") && (t = t.slice(1));
			for (var i = t.split("&"), a = 0; a < i.length; a++) {
				var c = i[a],
					s = c.indexOf("="); - 1 < s ? d(n, y(c.slice(0, s)), y(c.slice(s + 1))) : c && d(n, y(c), "");
			}
		}
		return n;
	}

	function d(t, n, r) {
		var e = "string" == typeof r ? r : null != r && "function" == typeof r.toString ? r.toString() : JSON.stringify(r);
		b(t, n) ? t[n].push(e) : t[n] = [e];
	}

	function m(t) {
		return !!t && "[object Array]" === Object.prototype.toString.call(t);
	}

	function b(t, n) {
		return Object.prototype.hasOwnProperty.call(t, n);
	}
}("undefined" != typeof global ? global : "undefined" != typeof window ? window : this);
var QRCode;
! function() {
	function a(a) {
		this.mode = c.MODE_8BIT_BYTE, this.data = a, this.parsedData = [];
		for (var b = [], d = 0, e = this.data.length; e > d; d++) {
			var f = this.data.charCodeAt(d);
			f > 65536 ? (b[0] = 240 | (1835008 & f) >>> 18, b[1] = 128 | (258048 & f) >>> 12, b[2] = 128 | (4032 & f) >>> 6, b[3] = 128 | 63 & f) : f > 2048 ? (b[0] = 224 | (61440 & f) >>> 12, b[1] = 128 | (4032 & f) >>> 6, b[2] = 128 | 63 & f) : f > 128 ? (b[0] = 192 | (1984 & f) >>> 6, b[1] = 128 | 63 & f) : b[0] = f, this.parsedData = this.parsedData.concat(b);
		}
		this.parsedData.length != this.data.length && (this.parsedData.unshift(191), this.parsedData.unshift(187), this.parsedData.unshift(239));
	}

	function b(a, b) {
		this.typeNumber = a, this.errorCorrectLevel = b, this.modules = null, this.moduleCount = 0, this.dataCache = null, this.dataList = [];
	}

	function i(a, b) {
		if (void 0 == a.length) throw new Error(a.length + "/" + b);
		for (var c = 0; c < a.length && 0 == a[c];) c++;
		this.num = new Array(a.length - c + b);
		for (var d = 0; d < a.length - c; d++) this.num[d] = a[d + c];
	}

	function j(a, b) {
		this.totalCount = a, this.dataCount = b;
	}

	function k() {
		this.buffer = [], this.length = 0;
	}

	function m() {
		return "undefined" != typeof CanvasRenderingContext2D;
	}

	function n() {
		var a = !1,
			b = navigator.userAgent;
		return /android/i.test(b) && (a = !0, aMat = b.toString().match(/android ([0-9]\.[0-9])/i), aMat && aMat[1] && (a = parseFloat(aMat[1]))), a;
	}

	function r(a, b) {
		for (var c = 1, e = s(a), f = 0, g = l.length; g >= f; f++) {
			var h = 0;
			switch (b) {
				case d.L:
					h = l[f][0];
					break;
				case d.M:
					h = l[f][1];
					break;
				case d.Q:
					h = l[f][2];
					break;
				case d.H:
					h = l[f][3];
			}
			if (h >= e) break;
			c++;
		}
		if (c > l.length) throw new Error("Too long data");
		return c;
	}

	function s(a) {
		var b = encodeURI(a).toString().replace(/\%[0-9a-fA-F]{2}/g, "a");
		return b.length + (b.length != a ? 3 : 0);
	}
	a.prototype = {
		getLength: function getLength() {
			return this.parsedData.length;
		},
		write: function write(a) {
			for (var b = 0, c = this.parsedData.length; c > b; b++) a.put(this.parsedData[b], 8);
		}
	}, b.prototype = {
		addData: function addData(b) {
			var c = new a(b);
			this.dataList.push(c), this.dataCache = null;
		},
		isDark: function isDark(a, b) {
			if (0 > a || this.moduleCount <= a || 0 > b || this.moduleCount <= b) throw new Error(a + "," + b);
			return this.modules[a][b];
		},
		getModuleCount: function getModuleCount() {
			return this.moduleCount;
		},
		make: function make() {
			this.makeImpl(!1, this.getBestMaskPattern());
		},
		makeImpl: function makeImpl(a, c) {
			this.moduleCount = 4 * this.typeNumber + 17, this.modules = new Array(this.moduleCount);
			for (var d = 0; d < this.moduleCount; d++) {
				this.modules[d] = new Array(this.moduleCount);
				for (var e = 0; e < this.moduleCount; e++) this.modules[d][e] = null;
			}
			this.setupPositionProbePattern(0, 0), this.setupPositionProbePattern(this.moduleCount - 7, 0), this.setupPositionProbePattern(0, this.moduleCount - 7), this.setupPositionAdjustPattern(), this.setupTimingPattern(), this.setupTypeInfo(a, c), this.typeNumber >= 7 && this.setupTypeNumber(a), null == this.dataCache && (this.dataCache = b.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)), this.mapData(this.dataCache, c);
		},
		setupPositionProbePattern: function setupPositionProbePattern(a, b) {
			for (var c = -1; 7 >= c; c++) if (!(-1 >= a + c || this.moduleCount <= a + c)) for (var d = -1; 7 >= d; d++) - 1 >= b + d || this.moduleCount <= b + d || (this.modules[a + c][b + d] = c >= 0 && 6 >= c && (0 == d || 6 == d) || d >= 0 && 6 >= d && (0 == c || 6 == c) || c >= 2 && 4 >= c && d >= 2 && 4 >= d ? !0 : !1);
		},
		getBestMaskPattern: function getBestMaskPattern() {
			for (var a = 0, b = 0, c = 0; 8 > c; c++) {
				this.makeImpl(!0, c);
				var d = f.getLostPoint(this);
				(0 == c || a > d) && (a = d, b = c);
			}
			return b;
		},
		createMovieClip: function createMovieClip(a, b, c) {
			var d = a.createEmptyMovieClip(b, c),
				e = 1;
			this.make();
			for (var f = 0; f < this.modules.length; f++) for (var g = f * e, h = 0; h < this.modules[f].length; h++) {
				var i = h * e,
					j = this.modules[f][h];
				j && (d.beginFill(0, 100), d.moveTo(i, g), d.lineTo(i + e, g), d.lineTo(i + e, g + e), d.lineTo(i, g + e), d.endFill());
			}
			return d;
		},
		setupTimingPattern: function setupTimingPattern() {
			for (var a = 8; a < this.moduleCount - 8; a++) null == this.modules[a][6] && (this.modules[a][6] = 0 == a % 2);
			for (var b = 8; b < this.moduleCount - 8; b++) null == this.modules[6][b] && (this.modules[6][b] = 0 == b % 2);
		},
		setupPositionAdjustPattern: function setupPositionAdjustPattern() {
			for (var a = f.getPatternPosition(this.typeNumber), b = 0; b < a.length; b++) for (var c = 0; c < a.length; c++) {
				var d = a[b],
					e = a[c];
				if (null == this.modules[d][e]) for (var g = -2; 2 >= g; g++) for (var h = -2; 2 >= h; h++) this.modules[d + g][e + h] = -2 == g || 2 == g || -2 == h || 2 == h || 0 == g && 0 == h ? !0 : !1;
			}
		},
		setupTypeNumber: function setupTypeNumber(a) {
			for (var b = f.getBCHTypeNumber(this.typeNumber), c = 0; 18 > c; c++) {
				var d = !a && 1 == (1 & b >> c);
				this.modules[Math.floor(c / 3)][c % 3 + this.moduleCount - 8 - 3] = d;
			}
			for (var c = 0; 18 > c; c++) {
				var d = !a && 1 == (1 & b >> c);
				this.modules[c % 3 + this.moduleCount - 8 - 3][Math.floor(c / 3)] = d;
			}
		},
		setupTypeInfo: function setupTypeInfo(a, b) {
			for (var c = this.errorCorrectLevel << 3 | b, d = f.getBCHTypeInfo(c), e = 0; 15 > e; e++) {
				var g = !a && 1 == (1 & d >> e);
				6 > e ? this.modules[e][8] = g : 8 > e ? this.modules[e + 1][8] = g : this.modules[this.moduleCount - 15 + e][8] = g;
			}
			for (var e = 0; 15 > e; e++) {
				var g = !a && 1 == (1 & d >> e);
				8 > e ? this.modules[8][this.moduleCount - e - 1] = g : 9 > e ? this.modules[8][15 - e - 1 + 1] = g : this.modules[8][15 - e - 1] = g;
			}
			this.modules[this.moduleCount - 8][8] = !a;
		},
		mapData: function mapData(a, b) {
			for (var c = -1, d = this.moduleCount - 1, e = 7, g = 0, h = this.moduleCount - 1; h > 0; h -= 2) for (6 == h && h--;;) {
				for (var i = 0; 2 > i; i++) if (null == this.modules[d][h - i]) {
					var j = !1;
					g < a.length && (j = 1 == (1 & a[g] >>> e));
					var k = f.getMask(b, d, h - i);
					k && (j = !j), this.modules[d][h - i] = j, e--, -1 == e && (g++, e = 7);
				}
				if (d += c, 0 > d || this.moduleCount <= d) {
					d -= c, c = -c;
					break;
				}
			}
		}
	}, b.PAD0 = 236, b.PAD1 = 17, b.createData = function(a, c, d) {
		for (var e = j.getRSBlocks(a, c), g = new k(), h = 0; h < d.length; h++) {
			var i = d[h];
			g.put(i.mode, 4), g.put(i.getLength(), f.getLengthInBits(i.mode, a)), i.write(g);
		}
		for (var l = 0, h = 0; h < e.length; h++) l += e[h].dataCount;
		if (g.getLengthInBits() > 8 * l) throw new Error("code length overflow. (" + g.getLengthInBits() + ">" + 8 * l + ")");
		for (g.getLengthInBits() + 4 <= 8 * l && g.put(0, 4); 0 != g.getLengthInBits() % 8;) g.putBit(!1);
		for (;;) {
			if (g.getLengthInBits() >= 8 * l) break;
			if (g.put(b.PAD0, 8), g.getLengthInBits() >= 8 * l) break;
			g.put(b.PAD1, 8);
		}
		return b.createBytes(g, e);
	}, b.createBytes = function(a, b) {
		for (var c = 0, d = 0, e = 0, g = new Array(b.length), h = new Array(b.length), j = 0; j < b.length; j++) {
			var k = b[j].dataCount,
				l = b[j].totalCount - k;
			d = Math.max(d, k), e = Math.max(e, l), g[j] = new Array(k);
			for (var m = 0; m < g[j].length; m++) g[j][m] = 255 & a.buffer[m + c];
			c += k;
			var n = f.getErrorCorrectPolynomial(l),
				o = new i(g[j], n.getLength() - 1),
				p = o.mod(n);
			h[j] = new Array(n.getLength() - 1);
			for (var m = 0; m < h[j].length; m++) {
				var q = m + p.getLength() - h[j].length;
				h[j][m] = q >= 0 ? p.get(q) : 0;
			}
		}
		for (var r = 0, m = 0; m < b.length; m++) r += b[m].totalCount;
		for (var s = new Array(r), t = 0, m = 0; d > m; m++) for (var j = 0; j < b.length; j++) m < g[j].length && (s[t++] = g[j][m]);
		for (var m = 0; e > m; m++) for (var j = 0; j < b.length; j++) m < h[j].length && (s[t++] = h[j][m]);
		return s;
	};
	for (var c = {
		MODE_NUMBER: 1,
		MODE_ALPHA_NUM: 2,
		MODE_8BIT_BYTE: 4,
		MODE_KANJI: 8
	}, d = {
		L: 1,
		M: 0,
		Q: 3,
		H: 2
	}, e = {
		PATTERN000: 0,
		PATTERN001: 1,
		PATTERN010: 2,
		PATTERN011: 3,
		PATTERN100: 4,
		PATTERN101: 5,
		PATTERN110: 6,
		PATTERN111: 7
	}, f = {
		PATTERN_POSITION_TABLE: [
			[],
			[6, 18],
			[6, 22],
			[6, 26],
			[6, 30],
			[6, 34],
			[6, 22, 38],
			[6, 24, 42],
			[6, 26, 46],
			[6, 28, 50],
			[6, 30, 54],
			[6, 32, 58],
			[6, 34, 62],
			[6, 26, 46, 66],
			[6, 26, 48, 70],
			[6, 26, 50, 74],
			[6, 30, 54, 78],
			[6, 30, 56, 82],
			[6, 30, 58, 86],
			[6, 34, 62, 90],
			[6, 28, 50, 72, 94],
			[6, 26, 50, 74, 98],
			[6, 30, 54, 78, 102],
			[6, 28, 54, 80, 106],
			[6, 32, 58, 84, 110],
			[6, 30, 58, 86, 114],
			[6, 34, 62, 90, 118],
			[6, 26, 50, 74, 98, 122],
			[6, 30, 54, 78, 102, 126],
			[6, 26, 52, 78, 104, 130],
			[6, 30, 56, 82, 108, 134],
			[6, 34, 60, 86, 112, 138],
			[6, 30, 58, 86, 114, 142],
			[6, 34, 62, 90, 118, 146],
			[6, 30, 54, 78, 102, 126, 150],
			[6, 24, 50, 76, 102, 128, 154],
			[6, 28, 54, 80, 106, 132, 158],
			[6, 32, 58, 84, 110, 136, 162],
			[6, 26, 54, 82, 110, 138, 166],
			[6, 30, 58, 86, 114, 142, 170]
		],
		G15: 1335,
		G18: 7973,
		G15_MASK: 21522,
		getBCHTypeInfo: function getBCHTypeInfo(a) {
			for (var b = a << 10; f.getBCHDigit(b) - f.getBCHDigit(f.G15) >= 0;) b ^= f.G15 << f.getBCHDigit(b) - f.getBCHDigit(f.G15);
			return (a << 10 | b) ^ f.G15_MASK;
		},
		getBCHTypeNumber: function getBCHTypeNumber(a) {
			for (var b = a << 12; f.getBCHDigit(b) - f.getBCHDigit(f.G18) >= 0;) b ^= f.G18 << f.getBCHDigit(b) - f.getBCHDigit(f.G18);
			return a << 12 | b;
		},
		getBCHDigit: function getBCHDigit(a) {
			for (var b = 0; 0 != a;) b++, a >>>= 1;
			return b;
		},
		getPatternPosition: function getPatternPosition(a) {
			return f.PATTERN_POSITION_TABLE[a - 1];
		},
		getMask: function getMask(a, b, c) {
			switch (a) {
				case e.PATTERN000:
					return 0 == (b + c) % 2;
				case e.PATTERN001:
					return 0 == b % 2;
				case e.PATTERN010:
					return 0 == c % 3;
				case e.PATTERN011:
					return 0 == (b + c) % 3;
				case e.PATTERN100:
					return 0 == (Math.floor(b / 2) + Math.floor(c / 3)) % 2;
				case e.PATTERN101:
					return 0 == b * c % 2 + b * c % 3;
				case e.PATTERN110:
					return 0 == (b * c % 2 + b * c % 3) % 2;
				case e.PATTERN111:
					return 0 == (b * c % 3 + (b + c) % 2) % 2;
				default:
					throw new Error("bad maskPattern:" + a);
			}
		},
		getErrorCorrectPolynomial: function getErrorCorrectPolynomial(a) {
			for (var b = new i([1], 0), c = 0; a > c; c++) b = b.multiply(new i([1, g.gexp(c)], 0));
			return b;
		},
		getLengthInBits: function getLengthInBits(a, b) {
			if (b >= 1 && 10 > b) switch (a) {
				case c.MODE_NUMBER:
					return 10;
				case c.MODE_ALPHA_NUM:
					return 9;
				case c.MODE_8BIT_BYTE:
					return 8;
				case c.MODE_KANJI:
					return 8;
				default:
					throw new Error("mode:" + a);
			} else if (27 > b) switch (a) {
				case c.MODE_NUMBER:
					return 12;
				case c.MODE_ALPHA_NUM:
					return 11;
				case c.MODE_8BIT_BYTE:
					return 16;
				case c.MODE_KANJI:
					return 10;
				default:
					throw new Error("mode:" + a);
			} else {
				if (!(41 > b)) throw new Error("type:" + b);
				switch (a) {
					case c.MODE_NUMBER:
						return 14;
					case c.MODE_ALPHA_NUM:
						return 13;
					case c.MODE_8BIT_BYTE:
						return 16;
					case c.MODE_KANJI:
						return 12;
					default:
						throw new Error("mode:" + a);
				}
			}
		},
		getLostPoint: function getLostPoint(a) {
			for (var b = a.getModuleCount(), c = 0, d = 0; b > d; d++) for (var e = 0; b > e; e++) {
				for (var f = 0, g = a.isDark(d, e), h = -1; 1 >= h; h++) if (!(0 > d + h || d + h >= b)) for (var i = -1; 1 >= i; i++) 0 > e + i || e + i >= b || (0 != h || 0 != i) && g == a.isDark(d + h, e + i) && f++;
				f > 5 && (c += 3 + f - 5);
			}
			for (var d = 0; b - 1 > d; d++) for (var e = 0; b - 1 > e; e++) {
				var j = 0;
				a.isDark(d, e) && j++, a.isDark(d + 1, e) && j++, a.isDark(d, e + 1) && j++, a.isDark(d + 1, e + 1) && j++, (0 == j || 4 == j) && (c += 3);
			}
			for (var d = 0; b > d; d++) for (var e = 0; b - 6 > e; e++) a.isDark(d, e) && !a.isDark(d, e + 1) && a.isDark(d, e + 2) && a.isDark(d, e + 3) && a.isDark(d, e + 4) && !a.isDark(d, e + 5) && a.isDark(d, e + 6) && (c += 40);
			for (var e = 0; b > e; e++) for (var d = 0; b - 6 > d; d++) a.isDark(d, e) && !a.isDark(d + 1, e) && a.isDark(d + 2, e) && a.isDark(d + 3, e) && a.isDark(d + 4, e) && !a.isDark(d + 5, e) && a.isDark(d + 6, e) && (c += 40);
			for (var k = 0, e = 0; b > e; e++) for (var d = 0; b > d; d++) a.isDark(d, e) && k++;
			var l = Math.abs(100 * k / b / b - 50) / 5;
			return c += 10 * l;
		}
	}, g = {
		glog: function glog(a) {
			if (1 > a) throw new Error("glog(" + a + ")");
			return g.LOG_TABLE[a];
		},
		gexp: function gexp(a) {
			for (; 0 > a;) a += 255;
			for (; a >= 256;) a -= 255;
			return g.EXP_TABLE[a];
		},
		EXP_TABLE: new Array(256),
		LOG_TABLE: new Array(256)
	}, h = 0; 8 > h; h++) g.EXP_TABLE[h] = 1 << h;
	for (var h = 8; 256 > h; h++) g.EXP_TABLE[h] = g.EXP_TABLE[h - 4] ^ g.EXP_TABLE[h - 5] ^ g.EXP_TABLE[h - 6] ^ g.EXP_TABLE[h - 8];
	for (var h = 0; 255 > h; h++) g.LOG_TABLE[g.EXP_TABLE[h]] = h;
	i.prototype = {
		get: function get(a) {
			return this.num[a];
		},
		getLength: function getLength() {
			return this.num.length;
		},
		multiply: function multiply(a) {
			for (var b = new Array(this.getLength() + a.getLength() - 1), c = 0; c < this.getLength(); c++) for (var d = 0; d < a.getLength(); d++) b[c + d] ^= g.gexp(g.glog(this.get(c)) + g.glog(a.get(d)));
			return new i(b, 0);
		},
		mod: function mod(a) {
			if (this.getLength() - a.getLength() < 0) return this;
			for (var b = g.glog(this.get(0)) - g.glog(a.get(0)), c = new Array(this.getLength()), d = 0; d < this.getLength(); d++) c[d] = this.get(d);
			for (var d = 0; d < a.getLength(); d++) c[d] ^= g.gexp(g.glog(a.get(d)) + b);
			return new i(c, 0).mod(a);
		}
	}, j.RS_BLOCK_TABLE = [
		[1, 26, 19],
		[1, 26, 16],
		[1, 26, 13],
		[1, 26, 9],
		[1, 44, 34],
		[1, 44, 28],
		[1, 44, 22],
		[1, 44, 16],
		[1, 70, 55],
		[1, 70, 44],
		[2, 35, 17],
		[2, 35, 13],
		[1, 100, 80],
		[2, 50, 32],
		[2, 50, 24],
		[4, 25, 9],
		[1, 134, 108],
		[2, 67, 43],
		[2, 33, 15, 2, 34, 16],
		[2, 33, 11, 2, 34, 12],
		[2, 86, 68],
		[4, 43, 27],
		[4, 43, 19],
		[4, 43, 15],
		[2, 98, 78],
		[4, 49, 31],
		[2, 32, 14, 4, 33, 15],
		[4, 39, 13, 1, 40, 14],
		[2, 121, 97],
		[2, 60, 38, 2, 61, 39],
		[4, 40, 18, 2, 41, 19],
		[4, 40, 14, 2, 41, 15],
		[2, 146, 116],
		[3, 58, 36, 2, 59, 37],
		[4, 36, 16, 4, 37, 17],
		[4, 36, 12, 4, 37, 13],
		[2, 86, 68, 2, 87, 69],
		[4, 69, 43, 1, 70, 44],
		[6, 43, 19, 2, 44, 20],
		[6, 43, 15, 2, 44, 16],
		[4, 101, 81],
		[1, 80, 50, 4, 81, 51],
		[4, 50, 22, 4, 51, 23],
		[3, 36, 12, 8, 37, 13],
		[2, 116, 92, 2, 117, 93],
		[6, 58, 36, 2, 59, 37],
		[4, 46, 20, 6, 47, 21],
		[7, 42, 14, 4, 43, 15],
		[4, 133, 107],
		[8, 59, 37, 1, 60, 38],
		[8, 44, 20, 4, 45, 21],
		[12, 33, 11, 4, 34, 12],
		[3, 145, 115, 1, 146, 116],
		[4, 64, 40, 5, 65, 41],
		[11, 36, 16, 5, 37, 17],
		[11, 36, 12, 5, 37, 13],
		[5, 109, 87, 1, 110, 88],
		[5, 65, 41, 5, 66, 42],
		[5, 54, 24, 7, 55, 25],
		[11, 36, 12],
		[5, 122, 98, 1, 123, 99],
		[7, 73, 45, 3, 74, 46],
		[15, 43, 19, 2, 44, 20],
		[3, 45, 15, 13, 46, 16],
		[1, 135, 107, 5, 136, 108],
		[10, 74, 46, 1, 75, 47],
		[1, 50, 22, 15, 51, 23],
		[2, 42, 14, 17, 43, 15],
		[5, 150, 120, 1, 151, 121],
		[9, 69, 43, 4, 70, 44],
		[17, 50, 22, 1, 51, 23],
		[2, 42, 14, 19, 43, 15],
		[3, 141, 113, 4, 142, 114],
		[3, 70, 44, 11, 71, 45],
		[17, 47, 21, 4, 48, 22],
		[9, 39, 13, 16, 40, 14],
		[3, 135, 107, 5, 136, 108],
		[3, 67, 41, 13, 68, 42],
		[15, 54, 24, 5, 55, 25],
		[15, 43, 15, 10, 44, 16],
		[4, 144, 116, 4, 145, 117],
		[17, 68, 42],
		[17, 50, 22, 6, 51, 23],
		[19, 46, 16, 6, 47, 17],
		[2, 139, 111, 7, 140, 112],
		[17, 74, 46],
		[7, 54, 24, 16, 55, 25],
		[34, 37, 13],
		[4, 151, 121, 5, 152, 122],
		[4, 75, 47, 14, 76, 48],
		[11, 54, 24, 14, 55, 25],
		[16, 45, 15, 14, 46, 16],
		[6, 147, 117, 4, 148, 118],
		[6, 73, 45, 14, 74, 46],
		[11, 54, 24, 16, 55, 25],
		[30, 46, 16, 2, 47, 17],
		[8, 132, 106, 4, 133, 107],
		[8, 75, 47, 13, 76, 48],
		[7, 54, 24, 22, 55, 25],
		[22, 45, 15, 13, 46, 16],
		[10, 142, 114, 2, 143, 115],
		[19, 74, 46, 4, 75, 47],
		[28, 50, 22, 6, 51, 23],
		[33, 46, 16, 4, 47, 17],
		[8, 152, 122, 4, 153, 123],
		[22, 73, 45, 3, 74, 46],
		[8, 53, 23, 26, 54, 24],
		[12, 45, 15, 28, 46, 16],
		[3, 147, 117, 10, 148, 118],
		[3, 73, 45, 23, 74, 46],
		[4, 54, 24, 31, 55, 25],
		[11, 45, 15, 31, 46, 16],
		[7, 146, 116, 7, 147, 117],
		[21, 73, 45, 7, 74, 46],
		[1, 53, 23, 37, 54, 24],
		[19, 45, 15, 26, 46, 16],
		[5, 145, 115, 10, 146, 116],
		[19, 75, 47, 10, 76, 48],
		[15, 54, 24, 25, 55, 25],
		[23, 45, 15, 25, 46, 16],
		[13, 145, 115, 3, 146, 116],
		[2, 74, 46, 29, 75, 47],
		[42, 54, 24, 1, 55, 25],
		[23, 45, 15, 28, 46, 16],
		[17, 145, 115],
		[10, 74, 46, 23, 75, 47],
		[10, 54, 24, 35, 55, 25],
		[19, 45, 15, 35, 46, 16],
		[17, 145, 115, 1, 146, 116],
		[14, 74, 46, 21, 75, 47],
		[29, 54, 24, 19, 55, 25],
		[11, 45, 15, 46, 46, 16],
		[13, 145, 115, 6, 146, 116],
		[14, 74, 46, 23, 75, 47],
		[44, 54, 24, 7, 55, 25],
		[59, 46, 16, 1, 47, 17],
		[12, 151, 121, 7, 152, 122],
		[12, 75, 47, 26, 76, 48],
		[39, 54, 24, 14, 55, 25],
		[22, 45, 15, 41, 46, 16],
		[6, 151, 121, 14, 152, 122],
		[6, 75, 47, 34, 76, 48],
		[46, 54, 24, 10, 55, 25],
		[2, 45, 15, 64, 46, 16],
		[17, 152, 122, 4, 153, 123],
		[29, 74, 46, 14, 75, 47],
		[49, 54, 24, 10, 55, 25],
		[24, 45, 15, 46, 46, 16],
		[4, 152, 122, 18, 153, 123],
		[13, 74, 46, 32, 75, 47],
		[48, 54, 24, 14, 55, 25],
		[42, 45, 15, 32, 46, 16],
		[20, 147, 117, 4, 148, 118],
		[40, 75, 47, 7, 76, 48],
		[43, 54, 24, 22, 55, 25],
		[10, 45, 15, 67, 46, 16],
		[19, 148, 118, 6, 149, 119],
		[18, 75, 47, 31, 76, 48],
		[34, 54, 24, 34, 55, 25],
		[20, 45, 15, 61, 46, 16]
	], j.getRSBlocks = function(a, b) {
		var c = j.getRsBlockTable(a, b);
		if (void 0 == c) throw new Error("bad rs block @ typeNumber:" + a + "/errorCorrectLevel:" + b);
		for (var d = c.length / 3, e = [], f = 0; d > f; f++) for (var g = c[3 * f + 0], h = c[3 * f + 1], i = c[3 * f + 2], k = 0; g > k; k++) e.push(new j(h, i));
		return e;
	}, j.getRsBlockTable = function(a, b) {
		switch (b) {
			case d.L:
				return j.RS_BLOCK_TABLE[4 * (a - 1) + 0];
			case d.M:
				return j.RS_BLOCK_TABLE[4 * (a - 1) + 1];
			case d.Q:
				return j.RS_BLOCK_TABLE[4 * (a - 1) + 2];
			case d.H:
				return j.RS_BLOCK_TABLE[4 * (a - 1) + 3];
			default:
				return void 0;
		}
	}, k.prototype = {
		get: function get(a) {
			var b = Math.floor(a / 8);
			return 1 == (1 & this.buffer[b] >>> 7 - a % 8);
		},
		put: function put(a, b) {
			for (var c = 0; b > c; c++) this.putBit(1 == (1 & a >>> b - c - 1));
		},
		getLengthInBits: function getLengthInBits() {
			return this.length;
		},
		putBit: function putBit(a) {
			var b = Math.floor(this.length / 8);
			this.buffer.length <= b && this.buffer.push(0), a && (this.buffer[b] |= 128 >>> this.length % 8), this.length++;
		}
	};
	var l = [
		[17, 14, 11, 7],
		[32, 26, 20, 14],
		[53, 42, 32, 24],
		[78, 62, 46, 34],
		[106, 84, 60, 44],
		[134, 106, 74, 58],
		[154, 122, 86, 64],
		[192, 152, 108, 84],
		[230, 180, 130, 98],
		[271, 213, 151, 119],
		[321, 251, 177, 137],
		[367, 287, 203, 155],
		[425, 331, 241, 177],
		[458, 362, 258, 194],
		[520, 412, 292, 220],
		[586, 450, 322, 250],
		[644, 504, 364, 280],
		[718, 560, 394, 310],
		[792, 624, 442, 338],
		[858, 666, 482, 382],
		[929, 711, 509, 403],
		[1003, 779, 565, 439],
		[1091, 857, 611, 461],
		[1171, 911, 661, 511],
		[1273, 997, 715, 535],
		[1367, 1059, 751, 593],
		[1465, 1125, 805, 625],
		[1528, 1190, 868, 658],
		[1628, 1264, 908, 698],
		[1732, 1370, 982, 742],
		[1840, 1452, 1030, 790],
		[1952, 1538, 1112, 842],
		[2068, 1628, 1168, 898],
		[2188, 1722, 1228, 958],
		[2303, 1809, 1283, 983],
		[2431, 1911, 1351, 1051],
		[2563, 1989, 1423, 1093],
		[2699, 2099, 1499, 1139],
		[2809, 2213, 1579, 1219],
		[2953, 2331, 1663, 1273]
	],
		o = function() {
			var a = function a(_a, b) {
				this._el = _a, this._htOption = b;
			};
			return a.prototype.draw = function(a) {
				function g(a, b) {
					var c = document.createElementNS("http://www.w3.org/2000/svg", a);
					for (var d in b) b.hasOwnProperty(d) && c.setAttribute(d, b[d]);
					return c;
				}
				var b = this._htOption,
					c = this._el,
					d = a.getModuleCount();
				Math.floor(b.width / d), Math.floor(b.height / d), this.clear();
				var h = g("svg", {
					viewBox: "0 0 " + String(d) + " " + String(d),
					width: "100%",
					height: "100%",
					fill: b.colorLight
				});
				h.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink"), c.appendChild(h), h.appendChild(g("rect", {
					fill: b.colorDark,
					width: "1",
					height: "1",
					id: "template"
				}));
				for (var i = 0; d > i; i++) for (var j = 0; d > j; j++) if (a.isDark(i, j)) {
					var k = g("use", {
						x: String(i),
						y: String(j)
					});
					k.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template"), h.appendChild(k);
				}
			}, a.prototype.clear = function() {
				for (; this._el.hasChildNodes();) this._el.removeChild(this._el.lastChild);
			}, a;
		}(),
		p = "svg" === document.documentElement.tagName.toLowerCase(),
		q = p ? o : m() ? function() {
			function a() {
				this._elImage.src = this._elCanvas.toDataURL("image/png"), this._elImage.style.display = "block", this._elCanvas.style.display = "none";
			}

			function d(a, b) {
				var c = this;
				if (c._fFail = b, c._fSuccess = a, null === c._bSupportDataURI) {
					var d = document.createElement("img"),
						e = function e() {
							c._bSupportDataURI = !1, c._fFail && _fFail.call(c);
						},
						f = function f() {
							c._bSupportDataURI = !0, c._fSuccess && c._fSuccess.call(c);
						};
					return d.onabort = e, d.onerror = e, d.onload = f, d.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", void 0;
				}
				c._bSupportDataURI === !0 && c._fSuccess ? c._fSuccess.call(c) : c._bSupportDataURI === !1 && c._fFail && c._fFail.call(c);
			}
			if (this._android && this._android <= 2.1) {
				var b = 1 / window.devicePixelRatio,
					c = CanvasRenderingContext2D.prototype.drawImage;
				CanvasRenderingContext2D.prototype.drawImage = function(a, d, e, f, g, h, i, j) {
					if ("nodeName" in a && /img/i.test(a.nodeName)) for (var l = arguments.length - 1; l >= 1; l--) arguments[l] = arguments[l] * b;
					else "undefined" == typeof j && (arguments[1] *= b, arguments[2] *= b, arguments[3] *= b, arguments[4] *= b);
					c.apply(this, arguments);
				};
			}
			var e = function e(a, b) {
				this._bIsPainted = !1, this._android = n(), this._htOption = b, this._elCanvas = document.createElement("canvas"), this._elCanvas.width = b.width, this._elCanvas.height = b.height, a.appendChild(this._elCanvas), this._el = a, this._oContext = this._elCanvas.getContext("2d"), this._bIsPainted = !1, this._elImage = document.createElement("img"), this._elImage.style.display = "none", this._el.appendChild(this._elImage), this._bSupportDataURI = null;
			};
			return e.prototype.draw = function(a) {
				var b = this._elImage,
					c = this._oContext,
					d = this._htOption,
					e = a.getModuleCount(),
					f = d.width / e,
					g = d.height / e,
					h = Math.round(f),
					i = Math.round(g);
				b.style.display = "none", this.clear();
				for (var j = 0; e > j; j++) for (var k = 0; e > k; k++) {
					var l = a.isDark(j, k),
						m = k * f,
						n = j * g;
					c.strokeStyle = l ? d.colorDark : d.colorLight, c.lineWidth = 1, c.fillStyle = l ? d.colorDark : d.colorLight, c.fillRect(m, n, f, g), c.strokeRect(Math.floor(m) + .5, Math.floor(n) + .5, h, i), c.strokeRect(Math.ceil(m) - .5, Math.ceil(n) - .5, h, i);
				}
				this._bIsPainted = !0;
			}, e.prototype.makeImage = function() {
				this._bIsPainted && d.call(this, a);
			}, e.prototype.isPainted = function() {
				return this._bIsPainted;
			}, e.prototype.clear = function() {
				this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height), this._bIsPainted = !1;
			}, e.prototype.round = function(a) {
				return a ? Math.floor(1e3 * a) / 1e3 : a;
			}, e;
		}() : function() {
			var a = function a(_a2, b) {
				this._el = _a2, this._htOption = b;
			};
			return a.prototype.draw = function(a) {
				for (var b = this._htOption, c = this._el, d = a.getModuleCount(), e = Math.floor(b.width / d), f = Math.floor(b.height / d), g = ['<table style="border:0;border-collapse:collapse;">'], h = 0; d > h; h++) {
					g.push("<tr>");
					for (var i = 0; d > i; i++) g.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + e + "px;height:" + f + "px;background-color:" + (a.isDark(h, i) ? b.colorDark : b.colorLight) + ';"></td>');
					g.push("</tr>");
				}
				g.push("</table>"), c.innerHTML = g.join("");
				var j = c.childNodes[0],
					k = (b.width - j.offsetWidth) / 2,
					l = (b.height - j.offsetHeight) / 2;
				k > 0 && l > 0 && (j.style.margin = l + "px " + k + "px");
			}, a.prototype.clear = function() {
				this._el.innerHTML = "";
			}, a;
		}();
	QRCode = function QRCode(a, b) {
		if (this._htOption = {
			width: 256,
			height: 256,
			typeNumber: 4,
			colorDark: "#000000",
			colorLight: "#ffffff",
			correctLevel: d.H
		}, "string" == typeof b && (b = {
			text: b
		}), b) for (var c in b) this._htOption[c] = b[c];
		"string" == typeof a && (a = document.getElementById(a)), this._android = n(), this._el = a, this._oQRCode = null, this._oDrawing = new q(this._el, this._htOption), this._htOption.text && this.makeCode(this._htOption.text);
	}, QRCode.prototype.makeCode = function(a) {
		this._oQRCode = new b(r(a, this._htOption.correctLevel), this._htOption.correctLevel), this._oQRCode.addData(a), this._oQRCode.make(), this._el.title = a, this._oDrawing.draw(this._oQRCode), this.makeImage();
	}, QRCode.prototype.makeImage = function() {
		"function" == typeof this._oDrawing.makeImage && (!this._android || this._android >= 3) && this._oDrawing.makeImage();
	}, QRCode.prototype.clear = function() {
		this._oDrawing.clear();
	}, QRCode.CorrectLevel = d;
}();
(function() {
	var isTV = function isTV() {
		// специально
		return true;
		return Lampa.Platform.tv() || Lampa.Platform.is('android');
	};
	var isSelectAuth = function isSelectAuth() {
		return !['abvidaa.ru', 'abmsx.tech'].includes(window.location.host);
	};
	var BACKEND_HOST = 'backend.abmsx.tech';
	var TELEGRAM_BOT = 'Abcinema_bot';
	var SUPPORT_TELEGRAM_BOT = '@absup24_bot';
	var SHOW_SELECT_AUTH = isSelectAuth();
	var Observable = /*#__PURE__*/


		function() {
			function Observable() {
				_classCallCheck(this, Observable);
				this.observers = [];
			}
			return _createClass(Observable, [{
				key: "subscribe",
				value: function subscribe(f) {
					this.observers.push(f);
				}
			}, {
				key: "unsubscribe",
				value: function unsubscribe(f) {
					this.observers = this.observers.filter(function(subscriber) {
						return subscriber !== f;
					});
				}
			}, {
				key: "notify",
				value: function notify(data) {
					this.observers.forEach(function(observer) {
						return observer(data);
					});
				}
			}]);
		}();
	var Http = /*#__PURE__*/


		function() {
			function Http() {
				_classCallCheck(this, Http);
				_defineProperty(this, "network", new Lampa.Reguest());
			}
			return _createClass(Http, [{
				key: "get",
				value: function get(_ref) {
					var _this = this;
					var url = _ref.url,
						params = _ref.params;
					return new Promise(function(resolve, reject) {
						_this.network.silent(url, resolve, reject, void 0, params);
					});
				}
			}, {
				key: "post",
				value: function post(_ref2) {
					var _this2 = this;
					var url = _ref2.url,
						data = _ref2.data,
						params = _ref2.params;
					return new Promise(function(resolve, reject) {
						_this2.network.silent(url, resolve, reject, data, params);
					});
				}
			}]);
		}();
	var Device = /*#__PURE__*/


		function() {
			function Device() {
				_classCallCheck(this, Device);
				_defineProperty(this, "http", new Http());
			}
			return _createClass(Device, [{
				key: "getCode",
				value: function getCode() {
					return this.http.post({
						url: "//".concat(BACKEND_HOST, "/api/device/code"),
						data: JSON.stringify({
							deviceId: Math.random().toString(),
							deviceName: Lampa.Platform.get(),
							deviceType: Lampa.Platform.tv() ? 'tv' : 'desktop'
						}),
						params: {
							headers: {
								'Content-Type': 'application/json'
							}
						}
					});
				}
			}, {
				key: "login",
				value: function login(_ref3) {
					var code = _ref3.code,
						user_code = _ref3.user_code;
					return this.http.post({
						url: "//".concat(BACKEND_HOST, "/api/device/login"),
						data: JSON.stringify({
							code: code,
							user_code: user_code
						}),
						params: {
							headers: {
								'Content-Type': 'application/json'
							}
						}
					});
				}
			}, {
				key: "logout",
				value: function logout(_ref4) {
					var token = _ref4.token;
					return this.http.post({
						url: "//".concat(BACKEND_HOST, "/api/device/logout"),
						data: JSON.stringify({
							access_token: token
						}),
						params: {
							headers: {
								'Content-Type': 'application/json'
							}
						}
					});
				}
			}]);
		}();
	var User = /*#__PURE__*/


		function() {
			function User() {
				_classCallCheck(this, User);
				_defineProperty(this, "device", new Device());
				_defineProperty(this, "http", new Http());
				_defineProperty(this, "token", Lampa.Storage.get('token'));
				_defineProperty(this, "refreshToken", Lampa.Storage.get('refresh_token'));
				_defineProperty(this, "user", null);
				_defineProperty(this, "status", 'idle');
				_defineProperty(this, "observable", new Observable());
			}
			return _createClass(User, [{
				key: "setToken",
				value: function setToken(token) {
					this.token = token;
					Lampa.Storage.set('token', token);
				}
			}, {
				key: "setRefreshToken",
				value: function setRefreshToken(refreshToken) {
					this.refreshToken = refreshToken;
					Lampa.Storage.set('refresh_token', refreshToken);
				}
			}, {
				key: "logout",
				value: function() {
					var _logout = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee() {
						return _regeneratorRuntime().wrap(function _callee$(_context) {
							while (1) switch (_context.prev = _context.next) {
								case 0:
									_context.prev = 0;
									if (!isTV()) {
										_context.next = 4;
										break;
									}
									_context.next = 4;
									return this.device.logout({
										token: this.token
									});
								case 4:
									_context.prev = 4;
									this.setRefreshToken('');
									this.setToken('');
									Lampa.Storage.set('ab_account', '');
									Lampa.Storage.set('account_use', false);
									return _context.finish(4);
								case 10:
								case "end":
									return _context.stop();
							}
						}, _callee, this, [
							[0, , 4, 10]
						]);
					}));

					function logout() {
						return _logout.apply(this, arguments);
					}
					return logout;
				}()
			}, {
				key: "setStatus",
				value: function setStatus(status) {
					if (this.status !== status) {
						this.status = status;
						this.observable.notify({
							user: this.user,
							status: this.status
						});
					}
				}
			}, {
				key: "subscribe",
				value: function subscribe(cb) {
					this.observable.subscribe(cb);
				}
			}, {
				key: "unsubscribe",
				value: function unsubscribe(cb) {
					this.observable.unsubscribe(cb);
				}
			}, {
				key: "refreshTokenFn",
				value: function() {
					var _refreshTokenFn = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee2() {
						var response;
						return _regeneratorRuntime().wrap(function _callee2$(_context2) {
							while (1) switch (_context2.prev = _context2.next) {
								case 0:
									_context2.prev = 0;
									_context2.next = 3;
									return this.http.post({
										url: "//".concat(BACKEND_HOST, "/api/user/refresh-new"),
										data: JSON.stringify({
											refresh: this.refreshToken
										}),
										params: {
											headers: {
												'Content-Type': 'application/json'
											}
										}
									});
								case 3:
									response = _context2.sent;
									this.setToken(response.access_token);
									this.setRefreshToken(response.refresh_token);
									_context2.next = 15;
									break;
								case 8:
									_context2.prev = 8;
									_context2.t0 = _context2["catch"](0);
									this.setToken('');
									this.setRefreshToken('');
									Lampa.Storage.remove('ab_account', '');
									Lampa.Storage.set('account_use', false);
									throw _context2.t0;
								case 15:
								case "end":
									return _context2.stop();
							}
						}, _callee2, this, [
							[0, 8]
						]);
					}));

					function refreshTokenFn() {
						return _refreshTokenFn.apply(this, arguments);
					}
					return refreshTokenFn;
				}()
			}, {
				key: "getUser",
				value: function() {
					var _getUser = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee3() {
						var response;
						return _regeneratorRuntime().wrap(function _callee3$(_context3) {
							while (1) switch (_context3.prev = _context3.next) {
								case 0:
									_context3.prev = 0;
									this.setStatus('pending');
									if (this.token) {
										_context3.next = 4;
										break;
									}
									return _context3.abrupt("return");
								case 4:
									_context3.next = 6;
									return this.http.get({
										url: "//".concat(BACKEND_HOST, "/api/user/"),
										params: {
											headers: {
												Authorization: "Bearer ".concat(this.token)
											}
										}
									});
								case 6:
									response = _context3.sent;
									this.user = response;
									Lampa.Storage.set('ab_account', {
										"secuses": true,
										"email": this.user.email,
										"id": this.user.id,
										"token": this.token,
										"profile": {
											"id": this.user.id,
											"cid": 0,
											"name": "",
											"main": 1,
											"icon": "l_1"
										}
									});
									Lampa.Storage.set('account_use', true);
									_context3.next = 18;
									break;
								case 12:
									_context3.prev = 12;
									_context3.t0 = _context3["catch"](0);
									if (!((_context3.t0 === null || _context3.t0 === void 0 ? void 0 : _context3.t0.status) === 403)) {
										_context3.next = 17;
										break;
									}
									_context3.next = 17;
									return this.refreshTokenFn();
								case 17:
									throw _context3.t0;
								case 18:
									_context3.prev = 18;
									this.setStatus('fulfilled');
									return _context3.finish(18);
								case 21:
								case "end":
									return _context3.stop();
							}
						}, _callee3, this, [
							[0, 12, 18, 21]
						]);
					}));

					function getUser() {
						return _getUser.apply(this, arguments);
					}
					return getUser;
				}()
			}, {
				key: "isLoggedIn",
				get: function get() {
					return Boolean(this.user);
				}
			}]);
		}();
	var user = new User();
	var device = new Device();
	var loadScript = function loadScript(urls) {
		return new Promise(function(resolve, reject) {
			Lampa.Utils.putScriptAsync(urls, resolve, reject);
		});
	};
	var loadQrCodeJS = function loadQrCodeJS() {
		return loadScript(['//cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js']);
	};
	var fallbackCopyTextToClipboard = function fallbackCopyTextToClipboard(text) {
		var textArea = document.createElement('textarea');
		textArea.value = text;
		document.body.appendChild(textArea);
		textArea.style.position = 'fixed';
		textArea.style.top = '-200px';
		textArea.focus();
		textArea.select();
		try {
			if (!document.execCommand('copy')) {
				throw new Error('Error copying data to clipboard');
			}
		} catch (err) {
			console.error(err);
		}
		document.body.removeChild(textArea);
	};
	var copyTextToClipboard = /*#__PURE__*/


		function() {
			var _ref5 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee4(text) {
				var _navigator, clipboard;
				return _regeneratorRuntime().wrap(function _callee4$(_context4) {
					while (1) switch (_context4.prev = _context4.next) {
						case 0:
							_navigator = navigator, clipboard = _navigator.clipboard;
							if (clipboard) {
								_context4.next = 4;
								break;
							}
							fallbackCopyTextToClipboard(text);
							return _context4.abrupt("return");
						case 4:
							_context4.next = 6;
							return clipboard.writeText(text);
						case 6:
							return _context4.abrupt("return", _context4.sent);
						case 7:
						case "end":
							return _context4.stop();
					}
				}, _callee4);
			}));
			return function copyTextToClipboard(_x) {
				return _ref5.apply(this, arguments);
			};
		}();
	var TEMPLATE = {
		BUTTON_REDIRECT_TO_SIGN_IN: 'ab_redirect_to_sign_in',
		BUTTON_REDIRECT_TO_LK_TV: 'ab_redirect_to_lk_tv',
		BUTTON_REDIRECT_TO_SIGN_IN_TV_SELECT: 'ab_redirect_to_sign_in_tv_select',
		BUTTON_REDIRECT_TO_SIGN_IN_TV: 'ab_redirect_to_sign_in_tv',
		BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK: 'ab_redirect_to_sign_in_tv_fake_link',
		PURCHASE: 'purchase',
		PURCHASE_TV: 'purchase_tv',
		PURCHASE_TV_FAKE_LINK: 'purchase_tv_fake_link_tg',
		BUTTON_REDIRECT_TO_SIGN_IN_TG: 'ab_redirect_to_sign_in_tg',
		BUTTON_REDIRECT_TO_LK_TV_TG: 'ab_redirect_to_lk_tv_tg',
		BUTTON_REDIRECT_TO_SIGN_IN_TV_TG: 'ab_redirect_to_sign_in_tv_tg',
		BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK_TG: 'ab_redirect_to_sign_in_tv_fake_link_tg',
		PURCHASE_TG: 'purchase_tg',
		PURCHASE_TV_TG: 'purchase_tv_tg',
		PURCHASE_TV_FAKE_LINK_TG: 'purchase_tv_fake_link_tg'
	};
	Lampa.Template.add('ab_css', "\n        <style>\n            .qr-code-base {\n                display: flex;\n                justify-content: center;\n                width: 15em !important;\n            }\n            .qr-code-base > img,\n            .qr-code-base > canvas {\n                height: 15em !important;\n            }\n            \n            .modal-text {\n                font-size: 1.2em;\n                margin: 0.5em 0;\n            }\n            \n            .ab-link {\n                color: #fff;\n            }\n            \n            .link-button {\n                color: #fff;\n                text-decoration: none;\n            }\n            \n            .link-button:hover {\n                color: #000;                \n            }\n            \n            .align-center {\n                text-align: center;\n            }\n            \n            #sign-in-link {\n                cursor: pointer;\n            }\n        </style>\n    ");
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_LK_TV, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <div class=\"qr-code-base\" id=\"qr-code-to-lk\"></div>\n            <p class=\"modal-text\">\u0421\u0441\u044B\u043B\u043A\u0430 \u0432 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 {link}</p> \n            <br>\n            <a class=\"link-button full-start__button selector button--purchase-link\" style=\"margin: 0\" href=\"{link}\" target=\"_blank\">\u041F\u0435\u0440\u0435\u0439\u0442\u0438</a>\n        </div>\n    ");
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_LK_TV_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <div class=\"qr-code-base\" id=\"qr-code-to-lk\"></div>\n            <p class=\"modal-text\">\u041B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: </p>\n            <a class=\"link-button full-start__button selector button--purchase-link\" style=\"margin: 0\" href=\"{link_url}\" target=\"_blank\">{link_text}</a>            \n        </div>\n    ");
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p style=\"font-size: 1.4em;\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0443\u0436\u043D\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F</p>\n            <div class=\"redirect_lk__button full-start__button selector\">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438</div>\n        </div>\n    ");
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_SELECT, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column; text-align: center\">\n            <p class=\"modal-text\">\u0412\u044B \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u043B\u0438 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u0430\u0431\u0438\u043D\u0435\u0442 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C?</p>\n            \n            <div class=\"full-start__button selector button--select-auth-telegram\" style=\"width: 100px; margin: 1em 0; text-align: center; justify-content: center;\">\u0414\u0430</div>\n            <div class=\"full-start__button selector button--select-auth-web\" style=\"width: 100px; text-align: center; margin: 0; justify-content: center;\">\u041D\u0435\u0442</div>\n        </div>\n    ");
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0443\u0436\u043D\u043E \u0432\u043E\u0439\u0442\u0438 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442</p>\n            <div class=\"qr-code-base\" id=\"qr-code-redirect\"></div>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0441 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438\u043B\u0438 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0430 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 <a class=\"ab-link\" href=\"{link}?device_code={user_code}\" target=\"_blank\">{link}</a></p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434\u0443</p>\n            <p class=\"modal-text\">\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: <b>{user_code}</b></p>\n            <p class=\"modal-text\">\u043F\u043E\u0441\u043B\u0435 \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u044D\u0442\u043E \u043E\u043A\u043D\u043E, \u0436\u0434\u0438\u0442\u0435</p>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <div class=\"qr-code-base\" id=\"qr-code-redirect\"></div>\n\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F</p>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C \u0431\u043E\u0442</p>\n\n            <a class=\"link-button full-start__button selector button--purchase-link\" style=\"margin: 0\" target=\"_blank\" href=\"{link_url}?start=device_add_{user_code}\">\n                {link_text}\n            </a>\n            \n            <p class=\"modal-text\">\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 -> \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C</p>\n            <p class=\"modal-text\">\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: </p> \n            <p class=\"modal-text\"><b style=\"font-size: 1.5em\">{user_code}</b></p>\n            <br>\n\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0443\u0436\u043D\u043E \u0432\u043E\u0439\u0442\u0438 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442</p>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0441 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u0438\u043B\u0438 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0430 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435 <span id=\"sign-in-link\" data-href=\"{link}?device_code={user_code}\" style=\"text-decoration: underline\">{link}</span></p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434\u0443</p>\n            <p class=\"modal-text\">\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: <b>{user_code}</b></p>\n            <div class=\"qr-code-base\" id=\"qr-code-redirect\"></div>\n            <p class=\"modal-text\">\u043F\u043E\u0441\u043B\u0435 \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u044D\u0442\u043E \u043E\u043A\u043D\u043E, \u0436\u0434\u0438\u0442\u0435</p>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <div class=\"qr-code-base\" id=\"qr-code-redirect\"></div>\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F</p>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C \u0431\u043E\u0442</p>\n\n            <a class=\"link-button full-start__button selector button--purchase-link\" id=\"sign-in-link\" data-href=\"{link_url}?start=device_add_{user_code}\" style=\"margin: 0\">\n                {link_text}\n            </a>\n            \n            <p class=\"modal-text\">\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 -> \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C</p>\n            <p class=\"modal-text\">\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: </p> \n            <p class=\"modal-text\"><b style=\"font-size: 1.5em\">{user_code}</b></p>\n            <br>\n\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\"> \n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <div class=\"full-start__button selector button--purchase-link\">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043E\u043F\u043B\u0430\u0442\u0435</div>\n            <p class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \"\u041E\u043F\u043B\u0430\u0442\u0438\u043B\"</p>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\"> \n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <div class=\"full-start__button selector button--purchase-link\">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043E\u043F\u043B\u0430\u0442\u0435</div>\n            <p class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \"\u041E\u043F\u043B\u0430\u0442\u0438\u043B\"</p>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE_TV, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430 \u043A \u043E\u043F\u043B\u0430\u0442\u0435 \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0441\u0441\u044B\u043B\u043A\u043E\u0439 <a class=\"ab-link\" href=\"{pay_link}\" target=\"_blank\">{pay_link}</a></p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434</p>\n            <div class=\"qr-code-base\" id=\"qr-code-purchase\"></div>\n            <div class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u043E\u043F\u043B\u0430\u0442\u0438\u043B\"</div>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE_TV_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C \u0431\u043E\u0442 <a class=\"ab-link\" href=\"{pay_link}\" target=\"_blank\"><b>@".concat(TELEGRAM_BOT, "</b></a> \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0432 \u043C\u0435\u043D\u044E \"\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\"</p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434</p>\n            <div class=\"qr-code-base\" id=\"qr-code-purchase\"></div>\n            <div class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u043E\u043F\u043B\u0430\u0442\u0438\u043B\"</div>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE_TV_FAKE_LINK, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <p class=\"modal-text\">\u0414\u043B\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430 \u043A \u043E\u043F\u043B\u0430\u0442\u0435 \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435\u0441\u044C \u0441\u0441\u044B\u043B\u043A\u043E\u0439 <span id=\"sign-in-link\" data-href=\"{pay_link}\">{pay_link}</span></p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434</p>\n            <div class=\"qr-code-base\" id=\"qr-code-purchase\"></div>\n            <div class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u043E\u043F\u043B\u0430\u0442\u0438\u043B\"</div>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	Lampa.Template.add(TEMPLATE.PURCHASE_TV_FAKE_LINK_TG, "\n        <div class=\"align-center\" style=\"display: flex; align-items: center; flex-direction: column\">\n            <p class=\"modal-text\">\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043B\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443</p>\n            <p class=\"modal-text\">\u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C \u0431\u043E\u0442 <b>@".concat(TELEGRAM_BOT, "</b> \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0432 \u043C\u0435\u043D\u044E \"\u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\"</p>\n            <p class=\"modal-text\">\u0438\u043B\u0438 QR-\u043A\u043E\u0434</p>\n            <div class=\"qr-code-base\" id=\"qr-code-purchase\"></div>\n            <div class=\"modal-text\">\u041F\u043E\u0441\u043B\u0435 \u043E\u043F\u043B\u0430\u0442\u044B \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u043E\u043F\u043B\u0430\u0442\u0438\u043B\"</div>\n            <div class=\"full-start__button selector button--after-pay\">\u041E\u043F\u043B\u0430\u0442\u0438\u043B</div>\n            <p class=\"modal-text\">\u0415\u0441\u043B\u0438 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u0442\u0435\u043B\u0435\u0433\u0440\u0430\u043C: ".concat(SUPPORT_TELEGRAM_BOT, "</p>\n        </div>\n    "));
	var copyLinkToLk = /*#__PURE__*/


		function() {
			var _ref6 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee5() {
				var link;
				return _regeneratorRuntime().wrap(function _callee5$(_context5) {
					while (1) switch (_context5.prev = _context5.next) {
						case 0:
							_context5.prev = 0;
							link = $('#sign-in-link').data('href');
							_context5.next = 4;
							return copyTextToClipboard(link);
						case 4:
							Lampa.Noty.show(Lampa.Platform.tv() ? 'Воспользуйтесь телефоном или компьютером для перехода по ссылке' : 'Ссылка скопирована, воспользуйтесь ею в браузере', {
								time: 10000
							});
							_context5.next = 10;
							break;
						case 7:
							_context5.prev = 7;
							_context5.t0 = _context5["catch"](0);
							Lampa.Noty.show('Не удалось скопировать ссылку. Впишите её в браузер в ручную.', {
								time: 10000
							});
						case 10:
						case "end":
							return _context5.stop();
					}
				}, _callee5, null, [
					[0, 7]
				]);
			}));
			return function copyLinkToLk() {
				return _ref6.apply(this, arguments);
			};
		}();
	var getBaseDomain = function getBaseDomain() {
		if (window.location.hostname === 'localhost') {
			return 'localhost:3002';
		}
		if (window.location.hostname === 'ab2024.ru' || window.location.hostname === '45.67.228.34') {
			// старички уже привыкли к этому домену
			return 'lk.ab2024.ru';
		}
		return "lk.".concat(window.location.hostname);
	};
	var baseDomain = getBaseDomain();
	var redirectUrl = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.protocol + '//' + baseDomain;
	var insertStyles = function insertStyles() {
		$('body').append(Lampa.Template.get('ab_css'));
	};
	var showLoader = function showLoader() {
		Lampa.Activity.active().activity.loader(true);
	};
	var hideLoader = function hideLoader() {
		Lampa.Activity.active().activity.loader(false);
	};
	var init = /*#__PURE__*/


		function() {
			var _ref7 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee6() {
				var params, accessToken, refreshToken;
				return _regeneratorRuntime().wrap(function _callee6$(_context6) {
					while (1) switch (_context6.prev = _context6.next) {
						case 0:
							_context6.prev = 0;
							// showLoader()
							insertStyles();
							// await loadScript(['//cdn.jsdelivr.net/npm/url-search-params-polyfill@8.2.5/index.min.js'])
							params = new URLSearchParams(location.search);
							accessToken = params.get('access_token');
							refreshToken = params.get('refresh_token');
							if (accessToken && refreshToken) {
								user.setToken(accessToken);
								user.setRefreshToken(refreshToken);
							}
							_context6.next = 8;
							return user.getUser();
						case 8:
							_context6.prev = 8;
							return _context6.finish(8);
						case 10:
						case "end":
							return _context6.stop();
					}
				}, _callee6, null, [
					[0, , 8, 10]
				]);
			}));
			return function init() {
				return _ref7.apply(this, arguments);
			};
		}();
	init().then(function() {
		return console.log('ab success init');
	}).
	catch (function(e) {
		return console.error('ab error init', e);
	});
	var redirectToSignInPage = function redirectToSignInPage() {
		location.href = "".concat(redirectUrl, "?from=").concat(location.protocol, "//").concat(location.host, "&action=auth");
	};
	var showSignInModal = function showSignInModal() {
		var enabled = Lampa.Controller.enabled().name;
		Lampa.Modal.open({
			title: '',
			html: Lampa.Template.get(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN),
			// TODO сделать темплейт для ТГ после перехода
			// html: Lampa.Template.get(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TG),
			size: 'small',
			onBack: function onBack() {
				Lampa.Modal.close();
				Lampa.Controller.toggle(enabled);
			}
		});
		var redirectButton = $('.redirect_lk__button');
		redirectButton.on('hover:enter', function() {
			redirectToSignInPage();
		});
	};
	var showSignInTvModal = /*#__PURE__*/


		function() {
			var _ref8 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee9() {
				var enabled, _yield$Promise$all, _yield$Promise$all2, deviceCodeInfo, timer, closeModal, startCheckLogin, stopCheckLogin, checkVisibility, showModalForTelegram, showModalForWeb;
				return _regeneratorRuntime().wrap(function _callee9$(_context9) {
					while (1) switch (_context9.prev = _context9.next) {
						case 0:
							_context9.prev = 0;
							showLoader();
							enabled = Lampa.Controller.enabled().name;
							_context9.next = 5;
							return Promise.all([user.device.getCode(), loadQrCodeJS() ]); // Added loadQrCodeJS here as it's used below
						case 5:
							_yield$Promise$all = _context9.sent;
							_yield$Promise$all2 = _slicedToArray(_yield$Promise$all, 1);
							deviceCodeInfo = _yield$Promise$all2[0];
							closeModal = function closeModal() {
								Lampa.Modal.close();
								Lampa.Controller.toggle(enabled);
								stopCheckLogin();
								document.removeEventListener("visibilitychange", checkVisibility);
							};
							startCheckLogin = function startCheckLogin() {
								document.addEventListener("visibilitychange", checkVisibility);
								var auth = /*#__PURE__*/


									function() {
										var _ref9 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee7() {
											var response;
											return _regeneratorRuntime().wrap(function _callee7$(_context7) {
												while (1) switch (_context7.prev = _context7.next) {
													case 0:
														_context7.prev = 0;
														_context7.next = 3;
														return user.device.login({
															code: deviceCodeInfo.code,
															user_code: deviceCodeInfo.user_code
														});
													case 3:
														response = _context7.sent;
														clearInterval(timer);
														user.setRefreshToken(response.refresh_token);
														user.setToken(response.access_token);
														closeModal();
														showLoader();
														setTimeout(function() {
															location.reload();
														}, 1500);
														_context7.next = 15;
														break;
													case 12:
														_context7.prev = 12;
														_context7.t0 = _context7["catch"](0);
														throw _context7.t0;
													case 15:
													case "end":
														return _context7.stop();
												}
											}, _callee7, null, [
												[0, 12]
											]);
										}));
										return function auth() {
											return _ref9.apply(this, arguments);
										};
									}();
								auth();
								timer = setInterval( /*#__PURE__*/ _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee8() {
									return _regeneratorRuntime().wrap(function _callee8$(_context8) {
										while (1) switch (_context8.prev = _context8.next) {
											case 0:
												_context8.next = 2;
												return auth();
											case 2:
											case "end":
												return _context8.stop();
										}
									}, _callee8);
								})), 5000);
							};
							stopCheckLogin = function stopCheckLogin() {
								clearInterval(timer);
								timer = undefined;
							};
							checkVisibility = function checkVisibility() {
								if (document.hidden) {
									stopCheckLogin();
								} else {
									startCheckLogin();
								}
							};
							showModalForTelegram = function showModalForTelegram() {
								startCheckLogin();
								Lampa.Modal.open({
									title: '',
									html: Lampa.Template.get(Lampa.Platform.tv() || Lampa.Platform.is('android') ? TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK_TG : TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_TG, {
										user_code: deviceCodeInfo.user_code,
										link_url: "https://t.me/".concat(TELEGRAM_BOT),
										link_text: "@".concat(TELEGRAM_BOT)
									}),
									size: 'small',
									onBack: function onBack() {
										closeModal();
									}
								});
								$('#sign-in-link').on('click', copyLinkToLk);
								new QRCode("qr-code-redirect", {
									text: "https://t.me/".concat(TELEGRAM_BOT, "?start=device_add_").concat(deviceCodeInfo.user_code),
									colorDark: "#000000",
									colorLight: "#ffffff",
									width: 1000,
									height: 1000,
									correctLevel: QRCode.CorrectLevel.H
								});
							};
							showModalForWeb = function showModalForWeb() {
								startCheckLogin();
								Lampa.Modal.open({
									title: '',
									html: Lampa.Template.get(Lampa.Platform.tv() || Lampa.Platform.is('android') ? TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_FAKE_LINK : TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV, {
										user_code: deviceCodeInfo.user_code,
										link: "".concat(redirectUrl, "/activate")
									}),
									size: 'small',
									onBack: function onBack() {
										closeModal();
									}
								});
								$('#sign-in-link').on('click', copyLinkToLk);
								new QRCode("qr-code-redirect", {
									text: "".concat(redirectUrl, "/activate?device_code=").concat(deviceCodeInfo.user_code, "&fromQr=true"),
									colorDark: "#000000",
									colorLight: "#ffffff",
									width: 1000,
									height: 1000,
									correctLevel: QRCode.CorrectLevel.H
								});
							};
							if (SHOW_SELECT_AUTH) {
								Lampa.Modal.open({
									title: '',
									html: Lampa.Template.get(TEMPLATE.BUTTON_REDIRECT_TO_SIGN_IN_TV_SELECT),
									size: 'small',
									onBack: function onBack() {
										closeModal();
									}
								});
								$('.button--select-auth-telegram').on('hover:enter', function() {
									closeModal();
									showModalForTelegram();
								});
								$('.button--select-auth-web').on('hover:enter', function() {
									closeModal();
									showModalForWeb();
								});
							} else {
								showModalForTelegram();
							}
						case 15:
							_context9.prev = 15;
							hideLoader();
							return _context9.finish(15);
						case 18:
						case "end":
							return _context9.stop();
					}
				}, _callee9, null, [
					[0, , 15, 18]
				]);
			}));
			return function showSignInTvModal() {
				return _ref8.apply(this, arguments);
			};
		}();
	var showGoToLkModal = /*#__PURE__*/


		function() {
			var _ref11 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee10(user) {
				var _enabled;
				return _regeneratorRuntime().wrap(function _callee10$(_context10) {
					while (1) switch (_context10.prev = _context10.next) {
						case 0:
							_context10.prev = 0;
							showLoader();
							_context10.next = 4;
							return loadQrCodeJS(); // Ensure QRCode is loaded
						case 4:
							_enabled = Lampa.Controller.enabled().name;
							Lampa.Modal.open({
								title: 'Переход в личный кабинет',
								html: Lampa.Template.get(user.user.telegram_id ? TEMPLATE.BUTTON_REDIRECT_TO_LK_TV_TG : TEMPLATE.BUTTON_REDIRECT_TO_LK_TV, user.user.telegram_id ? {
									link_url: "https://t.me/".concat(TELEGRAM_BOT),
									link_text: "@".concat(TELEGRAM_BOT)
								} : {
									link: redirectUrl
								}),
								size: 'small',
								onBack: function onBack() {
									Lampa.Modal.close();
									Lampa.Controller.toggle(_enabled);
								}
							});
							new QRCode("qr-code-to-lk", {
								text: user.user.telegram_id ? "https://t.me/".concat(TELEGRAM_BOT) : "".concat(redirectUrl, "/account"),
								colorDark: "#000000",
								colorLight: "#ffffff",
								width: 1000,
								height: 1000,
								correctLevel: QRCode.CorrectLevel.H
							});
							_context10.prev = 7;
							hideLoader();
							return _context10.finish(7);
						case 10:
						case "end":
							return _context10.stop();
					}
				}, _callee10, null, [
					[0, , 7, 10]
				]);
			}));
			return function showGoToLkModal(_x2) {
				return _ref11.apply(this, arguments);
			};
		}();
	var onPlayClick = /*#__PURE__*/
		function() {
			var _ref12 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee11() {
				var _enabled2;
				return _regeneratorRuntime().wrap(function _callee11$(_context11) {
					while (1) switch (_context11.prev = _context11.next) {
						case 0:
							_context11.prev = 0;
							showLoader();
							_enabled2 = Lampa.Controller.enabled().name;

							// Removed isPaid check and related variables/logic for purchase modals
							if (!isTV()) {
								_context11.next = 9; // Adjusted jump if not TV
								break;
							}

							// TV Logic
							if (user.isLoggedIn) {
								// If logged in on TV, no specific action here to block play.
								// The original play action associated with the button should proceed.
								_context11.next = 8; // Proceed
								break;
							}
							_context11.next = 8; // Jump to show sign-in modal
							return showSignInTvModal(); // Not logged in on TV
						case 8:
							_context11.next = 10; // Consolidated next step
							break;

						case 9:
							// Desktop/Other Logic
							if (!user.isLoggedIn) {
								showSignInModal(); // Not logged in on Desktop
							}
							// If logged in on Desktop, no specific action here to block play.
						case 10:
							_context11.prev = 10; // Corresponds to original case 14 (start of finally)
							hideLoader();
							return _context11.finish(10); // Corresponds to original case 14 (end of finally)
						case 13: // Corresponds to original case 17 (end of try-catch)
						case "end":
							return _context11.stop();
					}
				}, _callee11, null, [
					[0, , 10, 13] // Adjusted try-finally structure
				]);
			}));
			return function onPlayClick() {
				return _ref12.apply(this, arguments);
			};
		}();
	Lampa.Listener.follow('full', /*#__PURE__*/ function() {
		var _ref13 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee12(e) {
			return _regeneratorRuntime().wrap(function _callee12$(_context12) {
				while (1) switch (_context12.prev = _context12.next) {
					case 0:
						if (e.type == 'complite') {
							$.when($('.view--online')).then(function() {
								var playButton = $('.view--online', Lampa.Activity.active().activity.render());
								$(playButton).insertBefore($('.button--play'));
								$('.view--torrent').insertBefore($('.button--play'));
								$('.view--trailer').insertBefore($('.button--play'));
								$('.button--play').remove();
								playButton.empty().append('<svg viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg>Загрузка...');
								Navigator.focus(playButton.get()[0]);
								var replace = function replace() {
									playButton.empty().append('<svg viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 32 32"><path d="m17 14.5 4.2-4.5L4.9 1.2c-.1-.1-.3-.1-.6-.2L17 14.5zM23 21l5.9-3.2c.7-.4 1.1-1 1.1-1.8s-.4-1.5-1.1-1.8L23 11l-4.7 5 4.7 5zM2.4 1.9c-.3.3-.4.7-.4 1.1v26c0 .4.1.8.4 1.2L15.6 16 2.4 1.9zM17 17.5 4.3 31c.2 0 .4-.1.6-.2L21.2 22 17 17.5z" fill="currentColor" fill="#ffffff" class="fill-000000"></path></svg>Начать просмотр');
									if (user.isLoggedIn) {
										// User is logged in, playButton ('.view--online') should trigger its native Lampa action.
										// No need to create a fake button here.
									} else {
										// Not logged in: create a fake button to intercept click and show login modal.
										var fakePlayButton = playButton.clone();
										fakePlayButton.insertBefore(playButton);
										var fakePlayButtonNode = fakePlayButton.get()[0];
										Navigator.add(fakePlayButtonNode);
										Navigator.focus(fakePlayButtonNode);
										playButton.hide(); // Hide the original one that would try to play
										fakePlayButton.on('hover:enter', onPlayClick); // onPlayClick will prompt for login
									}
								};
								if (user.status !== 'fulfilled') {
									user.observable.subscribe(function(_ref14) {
										var status = _ref14.status;
										console.log('subscribe user.status', user.status);
										if (status === 'fulfilled') replace();
									});
								} else {
									replace();
								}
							});
						}
					case 1:
					case "end":
						return _context12.stop();
				}
			}, _callee12);
		}));
		return function(_x3) {
			return _ref13.apply(this, arguments);
		};
	}());
	var appendTvFakeButton = function appendTvFakeButton() {
		var button = $("\n            <li class=\"menu__item selector js-my_iptv-menu0 binded\" style=\"\">\n                <div class=\"menu__ico\">\n                    <svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" style=\"fill-rule:evenodd;\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"></path><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"></path></svg>\n                </div>\n                <div class=\"menu__text js-my_iptv-menu0-title\">\u0422\u0435\u043B\u0435\u0432\u0438\u0437\u043E\u0440</div>\n            </li>");
		$('.menu .menu__list').eq(0).append(button);
		button.on('hover:enter', onPlayClick);
	};
	var addSettings = function addSettings() {
		Lampa.SettingsApi.addComponent({
			component: 'ab-account',
			name: 'Аккаунт',
			icon: "\n                <svg height=\"169\" viewBox=\"0 0 172 169\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"85.765\" cy=\"47.5683\" r=\"15.5683\" stroke=\"white\" stroke-width=\"12\"></circle>\n                    <path d=\"M121.53 112C121.53 92.2474 105.518 76.2349 85.7651 76.2349C66.0126 76.2349 50 92.2474 50 112\" stroke=\"white\" stroke-width=\"12\"></path>\n                    <rect x=\"44\" y=\"125\" width=\"84\" height=\"16\" rx=\"8\" fill=\"white\"></rect>\n                    <rect x=\"6\" y=\"6\" width=\"160\" height=\"157\" rx=\"21\" stroke=\"white\" stroke-width=\"12\"></rect>\n                </svg>\n            "
		});
		Lampa.Settings.listener.follow('open', function(e) {
			// TODO сделать аккаунт первым в списке
			if (e.name === 'main') {
				// const accountButton = $('.settings-folder[data-component="ab-account"]')
				// console.log('before accountButton',accountButton)

				// setTimeout(() => {
				//     $('.settings-folder[data-component="ab-account"]').promise().then((accountButton) => {
				//         console.log('after accountButton', accountButton)
				//         if (accountButton) {
				//             const parent = accountButton.parent()
				//
				//             parent.before(accountButton)
				//             Navigator.focus(accountButton.get()[0])
				//         }
				//     })
				// }, 0)
			}
		});
		if (user.isLoggedIn) {
			// Removed isPaid check here
			Lampa.SettingsApi.addParam({
				component: 'ab-account',
				param: {
					name: 'login',
					type: 'title'
				},
				field: {
					name: 'Логин',
					description: user.user.telegram_id || user.user.email || user.user.phone || "Нет логина"
				}
			});
			Lampa.SettingsApi.addParam({
				component: 'ab-account',
				param: {
					name: 'go-to-lk',
					type: 'button'
				},
				field: {
					name: 'Перейти в личный кабинет'
				}
			});
			Lampa.SettingsApi.addParam({
				component: 'ab-account',
				param: {
					name: 'logout',
					type: 'button'
				},
				field: {
					name: 'Выйти из аккаунта'
				}
			});
			Lampa.Settings.listener.follow('open', function(e) {
				if (e.name === 'ab-account') {
					var logoutButton = $('.settings-param[data-name="logout"]');
					var goToLkButton = $('.settings-param[data-name="go-to-lk"]');
					logoutButton.on('hover:enter', function() {
						var enabled = Lampa.Controller.enabled().name;
						var logout = /*#__PURE__*/


							function() {
								var _ref15 = _asyncToGenerator( /*#__PURE__*/ _regeneratorRuntime().mark(function _callee13() {
									return _regeneratorRuntime().wrap(function _callee13$(_context13) {
										while (1) switch (_context13.prev = _context13.next) {
											case 0:
												_context13.prev = 0;
												showLoader();
												_context13.next = 4;
												return user.logout();
											case 4:
												_context13.prev = 4;
												window.location.reload();
												hideLoader();
												return _context13.finish(4);
											case 8:
											case "end":
												return _context13.stop();
										}
									}, _callee13, null, [
										[0, , 4, 8]
									]);
								}));
								return function logout() {
									return _ref15.apply(this, arguments);
								};
							}();
						var closeModal = function closeModal() {
							Lampa.Modal.close();
							Lampa.Controller.toggle(enabled);
						};
						Lampa.Modal.open({
							title: 'Точно хотите выйти из аккаунта?',
							html: $('<div></div>'),
							size: 'small',
							onBack: closeModal,
							buttons: [{
								name: 'Нет',
								onSelect: closeModal
							}, {
								name: 'Да',
								onSelect: logout
							}]
						});
					});
					goToLkButton.on('hover:enter', function() {
						if (isTV()) {
							showGoToLkModal(user);
						} else {
							window.open(user.user.telegram_id ? "https://t.me/".concat(TELEGRAM_BOT) : "".concat(redirectUrl, "/account"), '_blank');
						}
					});
				}
			});
			
			// If logged in, always load the scripts, as payment is not a barrier
			var _window, _window$abScriptList;
			(_window$abScriptList = (_window = window).abScriptList) !== null && _window$abScriptList !== void 0 ? _window$abScriptList : _window.abScriptList = [];
			loadScript(window.abScriptList).then(function() {
				return console.log('downloaded ab plugins');
			});
			// appendTvFakeButton is not called here, assuming abScriptList provides TV functionality for logged-in users.

		} else { // Not logged in
			appendTvFakeButton(); // This button will trigger onPlayClick, which shows login modal.
			console.log('Lampa.SettingsApi.addParam for sign-in');
			Lampa.SettingsApi.addParam({
				component: 'ab-account',
				param: {
					name: 'sign-in',
					type: 'button'
				},
				field: {
					name: 'Войти в аккаунт'
				}
			});
			Lampa.Settings.listener.follow('open', function(e) {
				if (e.name === 'ab-account') {
					var signInButton = $('.settings-param[data-name="sign-in"]');
					signInButton.on('hover:enter', function() {
						if (isTV()) {
							showSignInTvModal();
						} else {
							redirectToSignInPage();
						}
					});
				}
			});
		}
	};
	var start = function start() {
		if (user.status === 'fulfilled') {
			addSettings();
		} else {
			user.subscribe(function(_ref16) {
				var status = _ref16.status;
				if (status === 'fulfilled') addSettings();
			});
		}
	};
	if ( !! window.appready) {
		start();
	} else {
		Lampa.Listener.follow('app', function(e) {
			if (e.type === 'ready') start();
		});
	}
})(); 