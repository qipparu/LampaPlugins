(function() {
	'use strict';

	// Определяем константы в самом начале IIFE, чтобы они были доступны везде
	var PLUGIN_ID_SUFFIX = '_ab'; // Суффикс для akter-black
	var PLUGIN_NAME_DISPLAY = 'Lampac (AB)'; // Отображаемое имя для этого плагина

	var Defined = {
		api: 'lampac' + PLUGIN_ID_SUFFIX, // Уникальное имя API
		localhost: 'https://akter-black.com/',
		apn: ''
	};

	var unic_id = Lampa.Storage.get('lampac_unic_id' + PLUGIN_ID_SUFFIX, ''); // Уникальный ID для хранения
	if (!unic_id) {
		unic_id = Lampa.Utils.uid(8).toLowerCase();
		Lampa.Storage.set('lampac_unic_id' + PLUGIN_ID_SUFFIX, unic_id);
	}

	if (!window.rch) { // Эта логика может конфликтовать, если rch от второго скрипта имеет другую структуру
		Lampa.Utils.putScript(["https://akter-black.com/invc-rch.js"], function() {}, false, function() {
			// Следующая строка была закомментирована, чтобы удалить предполагаемую проверку https://akter-black.com/cors/check
			// if (window.rch && !window.rch.startTypeInvoke) window.rch.typeInvoke('https://akter-black.com', function() {});
		}, true);
	}

	function BlazorNet() {
		this.net = new Lampa.Reguest();
		this.timeout = function(time) {
			this.net.timeout(time);
		};
		this.req = function(type, url, secuses, error, post) {
			var params = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
			var path = url.split(Defined.localhost).pop().split('?');
			if (path[0].indexOf('http') >= 0) return this.net[type](url, secuses, error, post, params);
			// Проверка на существование DotNet перед вызовом
			if (typeof DotNet !== 'undefined' && DotNet.invokeMethodAsync) {
				DotNet.invokeMethodAsync("JinEnergy", path[0], path[1]).then(function(result) {
					if (params.dataType == 'text') secuses(result);
					else secuses(Lampa.Arrays.decodeJson(result, {}));
				})["catch"](function(e) {
					console.log('Blazor' + PLUGIN_ID_SUFFIX, 'error:', e);
					error(e);
				});
			} else {
				console.error('Blazor' + PLUGIN_ID_SUFFIX, 'DotNet is not available.');
				error('DotNet is not available.');
			}
		};
		this.silent = function(url, secuses, error, post) {
			var params = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
			this.req('silent', url, secuses, error, post, params);
		};
		this["native"] = function(url, secuses, error, post) {
			var params = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
			this.req('native', url, secuses, error, post, params);
		};
		this.clear = function() {
			this.net.clear();
		};
	}

	var Network = Lampa.Reguest;
	//var Network = Defined.api.indexOf('pwa') == 0 && typeof Blazor !== 'undefined' ? BlazorNet : Lampa.Reguest;

	function component(object) {
		var network = new Network();
		var scroll = new Lampa.Scroll({
			mask: true,
			over: true
		});
		var files = new Lampa.Explorer(object);
		var filter = new Lampa.Filter(object);
		var sources = {};
		var last;
		var source;
		var balanser;
		var initialized;
		var balanser_timer;
		var images = [];
		var number_of_requests = 0;
		var number_of_requests_timer;
		var life_wait_times = 0;
		var life_wait_timer;
		var hubConnection; // Локальный для этого компонента
		var hub_timer; // Локальный для этого компонента
		var filter_sources = {};
		var filter_translate = {
			season: Lampa.Lang.translate('torrent_serial_season'),
			voice: Lampa.Lang.translate('torrent_parser_voice'),
			source: Lampa.Lang.translate('settings_rest_source')
		};
		var filter_find = {
			season: [],
			voice: []
		};
		var balansers_with_search = ['kinotochka', 'kinopub', 'lumex', 'filmix', 'filmixtv', 'redheadsound', 'animevost', 'animego', 'animedia', 'animebesst', 'anilibria', 'rezka', 'rhsprem', 'kodik', 'remux', 'animelib', 'kinoukr', 'rc/filmix', 'rc/fxapi', 'rc/kinopub', 'rc/rhs', 'vcdn'];

		function account(url) {
			url = url + '';
			if (url.indexOf('account_email=') == -1) {
				var email = Lampa.Storage.get('account_email');
				if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
			}
			if (url.indexOf('uid=') == -1) {
				var uid_val = Lampa.Storage.get('lampac_unic_id' + PLUGIN_ID_SUFFIX, ''); // Используем уникальный ID
				if (uid_val) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid_val));
			}
			if (url.indexOf('token=') == -1) {
				var token = ''; // Lampa.Storage.get('token_аккаунта_lampac_ab_если_есть')
				if (token) url = Lampa.Utils.addUrlComponent(url, 'token=' + token);
			}

			url = Lampa.Utils.addUrlComponent(url, 'ab_token=' + Lampa.Storage.get('token')); // Общий токен Lampa? Или специфичный для akter-black?

			return url;
		}

		function balanserName(j) {
			var bals = j.balanser;
			var name = j.name.split(' ')[0];
			return (bals || name).toLowerCase();
		}

		function clarificationSearchAdd(value) {
			var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title)
			var all = Lampa.Storage.get('clarification_search' + PLUGIN_ID_SUFFIX, '{}')

			all[id] = value

			Lampa.Storage.set('clarification_search' + PLUGIN_ID_SUFFIX, all)
		}

		function clarificationSearchDelete() {
			var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title)
			var all = Lampa.Storage.get('clarification_search' + PLUGIN_ID_SUFFIX, '{}')

			delete all[id]

			Lampa.Storage.set('clarification_search' + PLUGIN_ID_SUFFIX, all)
		}

		function clarificationSearchGet() {
			var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title)
			var all = Lampa.Storage.get('clarification_search' + PLUGIN_ID_SUFFIX, '{}')

			return all[id]
		}

		this.initialize = function() {
			var _this = this;
			this.loading(true);
			filter.onSearch = function(value) {
				clarificationSearchAdd(value)
				Lampa.Activity.replace({
					search: value,
					clarification: true
				});
			};
			filter.onBack = function() {
				_this.start();
			};
			filter.render().find('.selector').on('hover:enter', function() {
				clearInterval(balanser_timer);
			});
			filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
			filter.onSelect = function(type, a, b) {
				if (type == 'filter') {
					if (a.reset) {
						clarificationSearchDelete()
						_this.replaceChoice({
							season: 0,
							voice: 0,
							voice_url: '',
							voice_name: ''
						});
						setTimeout(function() {
							Lampa.Select.close();
							Lampa.Activity.replace({
								clarification: 0
							});
						}, 10);
					} else {
						var url = filter_find[a.stype][b.index].url;
						var choice = _this.getChoice();
						if (a.stype == 'voice') {
							choice.voice_name = filter_find.voice[b.index].title;
							choice.voice_url = url;
						}
						choice[a.stype] = b.index;
						_this.saveChoice(choice);
						_this.reset();
						_this.request(url);
						setTimeout(Lampa.Select.close, 10);
					}
				} else if (type == 'sort') {
					Lampa.Select.close();
					object.lampac_custom_select = a.source;
					_this.changeBalanser(a.source);
				}
			};
			if (filter.addButtonBack) filter.addButtonBack();
			filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser' + PLUGIN_ID_SUFFIX));
			scroll.body().addClass('torrent-list' + PLUGIN_ID_SUFFIX); // Уникальный класс для body
			files.appendFiles(scroll.render());
			files.appendHead(filter.render());
			scroll.minus(files.render().find('.explorer__files-head'));
			scroll.body().append(Lampa.Template.get('lampac_content_loading' + PLUGIN_ID_SUFFIX));
			Lampa.Controller.enable('content');
			this.loading(false);
			this.externalids().then(function() {
				return _this.createSource();
			}).then(function(json) {
				if (!balansers_with_search.find(function(b) {
					return balanser.slice(0, b.length) == b;
				})) {
					filter.render().find('.filter--search').addClass('hide');
				}
				_this.search();
			})["catch"](function(e) {
				_this.noConnectToServer(e);
			});
		};
		this.rch = function(json, noreset) {
			var _this2 = this;
			var load = function load() {
				if (hubConnection) {
					clearTimeout(hub_timer);
					hubConnection.stop();
					hubConnection = null;
					console.log('RCH' + PLUGIN_ID_SUFFIX, 'hubConnection stop');
				}
				if (typeof signalR === 'undefined') {
				    console.error('signalR is not defined for ' + PLUGIN_ID_SUFFIX);
				    if (noreset && typeof noreset === 'function') noreset(); else if(typeof _this2.find === 'function') _this2.find();
				    return;
				}
				hubConnection = new signalR.HubConnectionBuilder().withUrl(json.ws).build();
				hubConnection.start().then(function() {
					if (window.rch && window.rch.Registry) {
					    window.rch.Registry('https://akter-black.com', hubConnection, function() {
						    console.log('RCH' + PLUGIN_ID_SUFFIX, 'hubConnection start');
						    if (!noreset) _this2.find();
						    else noreset();
					    });
					} else {
					    console.error('window.rch or window.rch.Registry is not defined for ' + PLUGIN_ID_SUFFIX);
					    if (noreset && typeof noreset === 'function') noreset(); else if(typeof _this2.find === 'function') _this2.find();
					}
				})["catch"](function(err) {
					console.log('RCH' + PLUGIN_ID_SUFFIX, err.toString());
					if (noreset && typeof noreset === 'function') noreset(); else if(typeof _this2.find === 'function') _this2.find();
					return console.error(err.toString());
				});
				if (json.keepalive > 0) {
					hub_timer = setTimeout(function() {
						if(hubConnection) hubConnection.stop();
						hubConnection = null;
					}, 1000 * json.keepalive);
				}
			};
			if (typeof signalR == 'undefined') {
				Lampa.Utils.putScript(["https://akter-black.com/signalr-6.0.25_es5.js"], function() {}, false, function() {
					load();
				}, true);
			} else load();
		};
		this.externalids = function() {
			return new Promise(function(resolve, reject) {
				if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
					var query = [];
					query.push('id=' + object.movie.id);
					query.push('serial=' + (object.movie.name ? 1 : 0));
					if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
					if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
					var url = Defined.localhost + 'externalids?' + query.join('&');
					network.timeout(10000);
					network.silent(account(url), function(json) {
						for (var name in json) {
							object.movie[name] = json[name];
						}
						resolve();
					}, function() {
						resolve();
					});
				} else resolve();
			});
		};
		this.updateBalanser = function(balanser_name) {
			var last_select_balanser = Lampa.Storage.cache('online_last_balanser' + PLUGIN_ID_SUFFIX, 3000, {});
			last_select_balanser[object.movie.id] = balanser_name;
			Lampa.Storage.set('online_last_balanser' + PLUGIN_ID_SUFFIX, last_select_balanser);
		};
		this.changeBalanser = function(balanser_name) {
			this.updateBalanser(balanser_name);
			Lampa.Storage.set('online_balanser' + PLUGIN_ID_SUFFIX, balanser_name);
			var to = this.getChoice(balanser_name);
			var from = this.getChoice();
			if (from.voice_name) to.voice_name = from.voice_name;
			this.saveChoice(to, balanser_name);
			Lampa.Activity.replace();
		};
		this.requestParams = function(url) {
			var query = [];
			var card_source = object.movie.source || 'tmdb';
			query.push('id=' + object.movie.id);
			if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
			if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
			query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
			query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
			query.push('serial=' + (object.movie.name ? 1 : 0));
			query.push('original_language=' + (object.movie.original_language || ''));
			query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
			query.push('source=' + card_source);
			query.push('rchtype=' + (window.rch ? window.rch.type : ''));
			query.push('clarification=' + (object.clarification ? 1 : 0));
			if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
			return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
		};
		this.getLastChoiceBalanser = function() {
			var last_select_balanser = Lampa.Storage.cache('online_last_balanser' + PLUGIN_ID_SUFFIX, 3000, {});
			if (last_select_balanser[object.movie.id]) {
				return last_select_balanser[object.movie.id];
			} else {
				return Lampa.Storage.get('online_balanser' + PLUGIN_ID_SUFFIX, filter_sources.length ? filter_sources[0] : '');
			}
		};
		this.startSource = function(json) {
			return new Promise(function(resolve, reject) {
				json.forEach(function(j) {
					var name = balanserName(j);
					sources[name] = {
						url: j.url,
						name: j.name,
						show: typeof j.show == 'undefined' ? true : j.show
					};
				});
				filter_sources = Lampa.Arrays.getKeys(sources);
				if (filter_sources.length) {
					var last_select_balanser = Lampa.Storage.cache('online_last_balanser' + PLUGIN_ID_SUFFIX, 3000, {});
					if (last_select_balanser[object.movie.id]) {
						balanser = last_select_balanser[object.movie.id];
					} else {
						balanser = Lampa.Storage.get('online_balanser' + PLUGIN_ID_SUFFIX, filter_sources[0]);
					}
					if (!sources[balanser]) balanser = filter_sources[0];
					if (!sources[balanser].show && !object.lampac_custom_select) balanser = filter_sources[0];
					source = sources[balanser].url;
					resolve(json);
				} else {
					reject();
				}
			});
		};
		this.lifeSource = function() {
			var _this3 = this;
			var isFilm = false;

			return new Promise(function(resolve, reject) {
				var url = _this3.requestParams(Defined.localhost + 'lifeevents?memkey=' + (_this3.memkey || ''));
				var red = false;
				isFilm = url.indexOf('serial=0') > -1
				var gou = function gou(json, any) {
					if (json.accsdb) return reject(json);
					var last_balanser = _this3.getLastChoiceBalanser();
					if (!red) {
						var _filter = json.online.filter(function(c) {
							return any ? c.show : c.show && c.name.toLowerCase() == last_balanser;
						});
						if (_filter.length) {
							red = true;
							resolve(json.online.filter(function(c) {
								return c.show;
							}));
						} else if (any) {
							reject();
						}
					}
				};

				function is4k(data) {
					return data.name.indexOf('2160') > -1
				}

				function isLargeScreen() {
					return window.matchMedia("(min-width: 768px)").matches;
				}

				var fin = function fin(call) {
					network.timeout(3000);
					network.silent(account(url), function(json) {
						life_wait_times++;
						filter_sources = [];
						sources = {};
						json.online = json.online.filter(function(j) {
							if (j.balanser === 'filmix' || j.balanser === 'kinopub') {
								return is4k(j) && isLargeScreen()
							}
							return true
						})
						json.online.forEach(function(j) {
							var name = balanserName(j);
							sources[name] = {
								url: j.url,
								name: j.name,
								show: typeof j.show == 'undefined' ? true : j.show
							};
						});
						filter_sources = Lampa.Arrays.getKeys(sources);
						filter.set('sort', filter_sources.map(function(e) {
							return {
								title: sources[e].name,
								source: e,
								selected: e == balanser,
								ghost: !sources[e].show
							};
						}));
						if(sources[balanser]) filter.chosen('sort', [sources[balanser].name]); else filter.chosen('sort', [balanser]);
						gou(json);
						var lastb = _this3.getLastChoiceBalanser();
						if (life_wait_times > 15 || json.ready) {
							var loaderEl = filter.render().find('.lampac-balanser-loader');
                            if(loaderEl.length) loaderEl.remove();
							gou(json, true);
						} else if (!red && sources[lastb] && sources[lastb].show) {
							gou(json, true);
							life_wait_timer = setTimeout(fin, 1000);
						} else {
							life_wait_timer = setTimeout(fin, 1000);
						}
					}, function() {
						life_wait_times++;
						if (life_wait_times > 15) {
							reject();
						} else {
							life_wait_timer = setTimeout(fin, 1000);
						}
					});
				};
				fin();
			});
		};
		this.createSource = function() {
			var _this4 = this;
			return new Promise(function(resolve, reject) {
				var url = _this4.requestParams(Defined.localhost + 'lite/events?life=true');
				network.timeout(15000);
				network.silent(account(url), function(json) {
					if (json.accsdb) return reject(json);
					if (json.life) {
						_this4.memkey = json.memkey
						filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
						_this4.lifeSource().then(_this4.startSource).then(resolve)["catch"](reject);
					} else {
						_this4.startSource(json).then(resolve)["catch"](reject);
					}
				}, reject);
			});
		};
		this.create = function() {
			return this.render();
		};
		this.search = function() {
			this.filter({
				source: filter_sources
			}, this.getChoice());
			this.find();
		};
		this.find = function() {
			if(source) this.request(this.requestParams(source));
			else {
				console.warn(PLUGIN_NAME_DISPLAY + ": Source is undefined in find(). Maybe balanser was not set.");
				this.empty(); // Показать пустой результат, если нет источника
			}
		};
		this.request = function(url) {
			number_of_requests++;
			if (number_of_requests < 10) {
				network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
					dataType: 'text'
				});
				clearTimeout(number_of_requests_timer);
				number_of_requests_timer = setTimeout(function() {
					number_of_requests = 0;
				}, 4000);
			} else this.empty();
		};
		this.parseJsonDate = function(str, name) {
			try {
				var html = $('<div>' + str + '</div>');
				var elems = [];
				html.find(name).each(function() {
					var item = $(this);
					var data = JSON.parse(item.attr('data-json'));
					var season = item.attr('s');
					var episode = item.attr('e');
					var text = item.text();
					if (!object.movie.name) {
						if (text.match(/\d+p/i)) {
							if (!data.quality) {
								data.quality = {};
								data.quality[text] = data.url;
							}
							text = object.movie.title;
						}
						if (text == 'По умолчанию') {
							text = object.movie.title;
						}
					}
					if (episode) data.episode = parseInt(episode);
					if (season) data.season = parseInt(season);
					if (text) data.text = text;
					data.active = item.hasClass('active');
					elems.push(data);
				});
				return elems;
			} catch (e) {
				return [];
			}
		};
		this.getFileUrl = function(file, call) {
			var _this = this;

			function addAbToken(string) {
				return string + '&ab_token=' + Lampa.Storage.get('token');
			}

			if (file.stream && file.stream.indexOf('alloha') >= 0) {
				file.stream = addAbToken(file.stream);
			}

			if (file.url && file.url.indexOf('alloha') >= 0) {
				file.url = addAbToken(file.url);
			}

			if (Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')) {
				var newfile = Lampa.Arrays.clone(file)
				newfile.method = 'play'
				newfile.url = file.stream
				call(newfile, {});
			} else if (file.method == 'play') call(file, {});
			else {
				Lampa.Loading.start(function() {
					Lampa.Loading.stop();
					Lampa.Controller.toggle('content');
					network.clear();
				});
				network["native"](account(file.url), function(json) {
					if (json.rch) {
						_this.rch(json, function() {
							Lampa.Loading.stop();
							_this.getFileUrl(file, call)
						})
					} else {
						Lampa.Loading.stop();
						call(json, json);
					}
				}, function() {
					Lampa.Loading.stop();
					call(false, {});
				});
			}
		};
		this.toPlayElement = function(file) {
			var play = {
				title: file.title,
				url: file.url,
				quality: file.qualitys,
				timeline: file.timeline,
				subtitles: file.subtitles,
				callback: file.mark
			};
			return play;
		};
		this.appendAPN = function(data) {
			if (Defined.api.indexOf('pwa') == 0 && Defined.apn.length && data.url && typeof data.url == 'string' && data.url.indexOf(Defined.apn) == -1) data.url_reserve = Defined.apn + data.url;
		};
		this.setDefaultQuality = function(data) {
			if (data.quality && Lampa.Arrays.getKeys(data.quality).length) {
				for (var q in data.quality) {
					if (parseInt(q) == Lampa.Storage.field('video_quality_default')) {
						data.url = data.quality[q];
						this.appendAPN(data);
						break;
					}
				}
			}
		};
		this.display = function(videos) {
			var _this5 = this;
			this.draw(videos, {
				onEnter: function onEnter(item, html) {
					_this5.getFileUrl(item, function(json, json_call) {
						if (json && json.url) {
							var playlist = [];
							var first = _this5.toPlayElement(item);
							first.url = json.url;
							first.headers = json.headers;
							first.quality = json_call.quality || item.qualitys;
							first.subtitles = json.subtitles;
							first.vast_url = json.vast_url;
							first.vast_msg = json.vast_msg;
							_this5.appendAPN(first);
							_this5.setDefaultQuality(first);
							if (item.season) {
								videos.forEach(function(elem) {
									var cell = _this5.toPlayElement(elem);
									if (elem == item) cell.url = json.url;
									else {
										if (elem.method == 'call') {
											if (Lampa.Storage.field('player') !== 'inner') {
												cell.url = elem.stream;
												delete cell.quality
											} else {
												cell.url = function(call_item) { // Renamed 'call' to 'call_item'
													_this5.getFileUrl(elem, function(stream, stream_json) {
														if (stream.url) {
															cell.url = stream.url;
															cell.quality = stream_json.quality || elem.qualitys;
															cell.subtitles = stream.subtitles;
															_this5.appendAPN(cell);
															_this5.setDefaultQuality(cell);
															elem.mark();
														} else {
															cell.url = '';
															Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink' + PLUGIN_ID_SUFFIX));
														}
														call_item();
													}, function() {
														cell.url = '';
														call_item();
													});
												};
											}
										} else {
											cell.url = elem.url;
										}
									}
									_this5.appendAPN(cell);
									_this5.setDefaultQuality(cell);
									playlist.push(cell);
								});
							} else {
								playlist.push(first);
							}
							if (playlist.length > 1) first.playlist = playlist;
							if (first.url) {
								Lampa.Player.play(first);
								Lampa.Player.playlist(playlist);
								item.mark();
								_this5.updateBalanser(balanser);
							} else {
								Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink' + PLUGIN_ID_SUFFIX));
							}
						} else Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink' + PLUGIN_ID_SUFFIX));
					}, true);
				},
				onContextMenu: function onContextMenu(item, html, data, call) {
					_this5.getFileUrl(item, function(stream) {
						call({
							file: stream.url,
							quality: item.qualitys
						});
					}, true);
				}
			});
			this.filter({
				season: filter_find.season.map(function(s) {
					return s.title;
				}),
				voice: filter_find.voice.map(function(b) {
					return b.title;
				})
			}, this.getChoice());
		};
		this.parse = function(str) {
			var json = Lampa.Arrays.decodeJson(str, {});
			if (Lampa.Arrays.isObject(str) && str.rch) json = str;
			if (json.rch) return this.rch(json);
			try {
				var items = this.parseJsonDate(str, '.videos__item');
				var buttons = this.parseJsonDate(str, '.videos__button');
				if (items.length == 1 && items[0].method == 'link' && !items[0].similar) {
					filter_find.season = items.map(function(s) {
						return {
							title: s.text,
							url: s.url
						};
					});
					this.replaceChoice({
						season: 0
					});
					this.request(items[0].url);
				} else {
					this.activity.loader(false);
					var videos = items.filter(function(v) {
						return v.method == 'play' || v.method == 'call';
					});
					var similar = items.filter(function(v) {
						return v.similar;
					});
					if (videos.length) {
						if (buttons.length) {
							filter_find.voice = buttons.map(function(b) {
								return {
									title: b.text,
									url: b.url
								};
							});
							var select_voice_url = this.getChoice(balanser).voice_url;
							var select_voice_name = this.getChoice(balanser).voice_name;
							var find_voice_url = buttons.find(function(v) {
								return v.url == select_voice_url;
							});
							var find_voice_name = buttons.find(function(v) {
								return v.text == select_voice_name;
							});
							var find_voice_active = buttons.find(function(v) {
								return v.active;
							});
							if (find_voice_url && !find_voice_url.active) {
								console.log('Lampac' + PLUGIN_ID_SUFFIX, 'go to voice', find_voice_url);
								this.replaceChoice({
									voice: buttons.indexOf(find_voice_url),
									voice_name: find_voice_url.text
								});
								this.request(find_voice_url.url);
							} else if (find_voice_name && !find_voice_name.active) {
								console.log('Lampac' + PLUGIN_ID_SUFFIX, 'go to voice', find_voice_name);
								this.replaceChoice({
									voice: buttons.indexOf(find_voice_name),
									voice_name: find_voice_name.text
								});
								this.request(find_voice_name.url);
							} else {
								if (find_voice_active) {
									this.replaceChoice({
										voice: buttons.indexOf(find_voice_active),
										voice_name: find_voice_active.text
									});
								}
								this.display(videos);
							}
						} else {
							this.replaceChoice({
								voice: 0,
								voice_url: '',
								voice_name: ''
							});
							this.display(videos);
						}
					} else if (items.length) {
						if (similar.length) {
							this.similars(similar);
							this.activity.loader(false);
						} else {
							filter_find.season = items.map(function(s) {
								return {
									title: s.text,
									url: s.url
								};
							});
							var select_season = this.getChoice(balanser).season;
							var season = filter_find.season[select_season];
							if (!season) season = filter_find.season[0];
							console.log('Lampac' + PLUGIN_ID_SUFFIX, 'go to season', season);
							this.request(season.url);
						}
					} else {
						this.doesNotAnswer(json);
					}
				}
			} catch (e) {
				console.log('Lampac' + PLUGIN_ID_SUFFIX, 'error', e.stack);
				this.doesNotAnswer(e);
			}
		};
		this.similars = function(json) {
			var _this6 = this;
			scroll.clear();
			json.forEach(function(elem) {
				elem.title = elem.text;
				elem.info = '';
				var info = [];
				var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
				if (year) info.push(year);
				if (elem.details) info.push(elem.details);
				var name = elem.title || elem.text;
				elem.title = name;
				elem.time = elem.time || '';
				elem.info = info.join('<span class="online-prestige-split">●</span>');
				var item = Lampa.Template.get('lampac_prestige_folder' + PLUGIN_ID_SUFFIX, elem);
				item.on('hover:enter', function() {
					_this6.reset();
					_this6.request(elem.url);
				}).on('hover:focus', function(e) {
					last = e.target;
					scroll.update($(e.target), true);
				});
				scroll.append(item);
			});
			this.filter({
				season: filter_find.season.map(function(s) {
					return s.title;
				}),
				voice: filter_find.voice.map(function(b) {
					return b.title;
				})
			}, this.getChoice());
			Lampa.Controller.enable('content');
		};
		this.getChoice = function(for_balanser) {
			var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser) + PLUGIN_ID_SUFFIX, 3000, {});
			var save = data[object.movie.id] || {};
			Lampa.Arrays.extend(save, {
				season: 0,
				voice: 0,
				voice_name: '',
				voice_id: 0,
				episodes_view: {},
				movie_view: ''
			});
			return save;
		};
		this.saveChoice = function(choice, for_balanser) {
			var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser) + PLUGIN_ID_SUFFIX, 3000, {});
			data[object.movie.id] = choice;
			Lampa.Storage.set('online_choice_' + (for_balanser || balanser) + PLUGIN_ID_SUFFIX, data);
			this.updateBalanser(for_balanser || balanser);
		};
		this.replaceChoice = function(choice, for_balanser) {
			var to = this.getChoice(for_balanser);
			Lampa.Arrays.extend(to, choice, true);
			this.saveChoice(to, for_balanser);
		};
		this.clearImages = function() {
			images.forEach(function(img) {
				img.onerror = function() {};
				img.onload = function() {};
				img.src = '';
			});
			images = [];
		};
		this.reset = function() {
			last = false;
			clearInterval(balanser_timer);
			network.clear();
			this.clearImages();
			scroll.render().find('.empty').remove();
			scroll.clear();
			scroll.reset();
			scroll.body().append(Lampa.Template.get('lampac_content_loading' + PLUGIN_ID_SUFFIX));
		};
		this.loading = function(status) {
			if (status) this.activity.loader(true);
			else {
				this.activity.loader(false);
				this.activity.toggle();
			}
		};
		this.filter = function(filter_items, choice) {
			var _this7 = this;
			var select = [];
			var add = function add(type, title) {
				var need = _this7.getChoice();
				var items = filter_items[type];
				var subitems = [];
				var value = need[type];
				items.forEach(function(name, i) {
					subitems.push({
						title: name,
						selected: value == i,
						index: i
					});
				});
				select.push({
					title: title,
					subtitle: items[value],
					items: subitems,
					stype: type
				});
			};
			filter_items.source = filter_sources;
			select.push({
				title: Lampa.Lang.translate('torrent_parser_reset'),
				reset: true
			});
			this.saveChoice(choice);
			if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
			if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
			filter.set('filter', select);
			filter.set('sort', filter_sources.map(function(e) {
				return {
					title: sources[e].name,
					source: e,
					selected: e == balanser,
					ghost: !sources[e].show
				};
			}));
			this.selected(filter_items);
		};
		this.selected = function(filter_items) {
			var need = this.getChoice(), select = [];
			for (var i in need) {
				if (filter_items[i] && filter_items[i].length) {
					if (i == 'voice') {
						select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
					} else if (i !== 'source') {
						if (filter_items.season && filter_items.season.length >= 1) { // Проверка на существование filter_items.season
							select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
						}
					}
				}
			}
			filter.chosen('filter', select);
			if(sources[balanser]) filter.chosen('sort', [sources[balanser].name]); else filter.chosen('sort', [balanser]);
		};
		this.getEpisodes = function(season, call) {
			var episodes = [];
			if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) return call(episodes);
			if (typeof object.movie.id == 'number' && object.movie.name) {
				var tmdburl = 'tv/' + object.movie.id + '/season/' + season + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru');
				var baseurl = Lampa.TMDB.api(tmdburl);
				network.timeout(1000 * 10);
				network["native"](baseurl, function(data) {
					episodes = data.episodes || [];
					call(episodes);
				}, function(a, c) {
					call(episodes);
				});
			} else call(episodes);
		};
		this.watched = function(set) {
			var file_id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
			var watched = Lampa.Storage.cache('online_watched_last' + PLUGIN_ID_SUFFIX, 5000, {});
			if (set) {
				if (!watched[file_id]) watched[file_id] = {};
				Lampa.Arrays.extend(watched[file_id], set, true);
				Lampa.Storage.set('online_watched_last' + PLUGIN_ID_SUFFIX, watched);
				this.updateWatched();
			} else {
				return watched[file_id];
			}
		};
		this.updateWatched = function() {
			var watched = this.watched();
			var body = scroll.body().find('.online-prestige'+PLUGIN_ID_SUFFIX+'-watched .online-prestige'+PLUGIN_ID_SUFFIX+'-watched__body').empty();
			if (watched) {
				var line = [];
				if (watched.balanser_name) line.push(watched.balanser_name);
				if (watched.voice_name) line.push(watched.voice_name);
				if (watched.season) line.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + watched.season);
				if (watched.episode) line.push(Lampa.Lang.translate('torrent_serial_episode') + ' ' + watched.episode);
				line.forEach(function(n) {
					body.append('<span>' + n + '</span>');
				});
			} else body.append('<span>' + Lampa.Lang.translate('lampac_no_watch_history' + PLUGIN_ID_SUFFIX) + '</span>');
		};
		this.draw = function(items) {
			var _this8 = this;
			var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			if (!items.length) return this.empty();
			scroll.clear();
			scroll.append(Lampa.Template.get('lampac_prestige_watched' + PLUGIN_ID_SUFFIX, {}));
			this.updateWatched();
			this.getEpisodes(items[0].season, function(episodes) {
				var viewed = Lampa.Storage.cache('online_view' + PLUGIN_ID_SUFFIX, 5000, []);
				var serial = object.movie.name ? true : false;
				var choice = _this8.getChoice();
				var fully = window.innerWidth > 480;
				var scroll_to_element = false;
				var scroll_to_mark = false;
				items.forEach(function(element, index) {
					var episode = serial && episodes.length && !params.similars ? episodes.find(function(e) {
						return e.episode_number == element.episode;
					}) : false;
					var episode_num = element.episode || index + 1;
					var episode_last = choice.episodes_view[element.season];
					var voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name || (serial ? 'Неизвестно' : element.text) || 'Неизвестно';
					if (element.quality) {
						element.qualitys = element.quality;
						element.quality = Lampa.Arrays.getKeys(element.quality)[0];
					}
					Lampa.Arrays.extend(element, {
						voice_name: voice_name,
						info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name,
						quality: '',
						time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
					});
					var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
					var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
					var data = {
						hash_timeline: hash_timeline,
						hash_behold: hash_behold
					};
					var info = [];
					if (element.season) {
						element.translate_episode_end = _this8.getLastEpisode(items);
						element.translate_voice = element.voice_name;
					}
					if (element.text && !episode) element.title = element.text;
					element.timeline = Lampa.Timeline.view(hash_timeline);
					if (episode) {
						element.title = episode.name;
						if (element.info.length < 30 && episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate' + PLUGIN_ID_SUFFIX, {
							rate: parseFloat(episode.vote_average + '').toFixed(1)
						}, true));
						if (episode.air_date && fully) info.push(Lampa.Utils.parseTime(episode.air_date).full);
					} else if (object.movie.release_date && fully) {
						info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
					}
					if (!serial && object.movie.tagline && element.info.length < 30) info.push(object.movie.tagline);
					if (element.info) info.push(element.info);
					if (info.length) element.info = info.map(function(i) {
						return '<span>' + i + '</span>';
					}).join('<span class="online-prestige-split">●</span>'); // Общий класс, может потребовать адаптации
					var html = Lampa.Template.get('lampac_prestige_full' + PLUGIN_ID_SUFFIX, element);
					var loader = html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__loader');
					var image = html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__img');
					if (!serial) {
						if (choice.movie_view == hash_behold) scroll_to_element = html;
					} else if (typeof episode_last !== 'undefined' && episode_last == episode_num) {
						scroll_to_element = html;
					}
					if (serial && !episode) {
						image.append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>');
						loader.remove();
					} else if (!serial && ['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) loader.remove();
					else {
						var img = html.find('img')[0];
						img.onerror = function() {
							img.src = './img/img_broken.svg';
						};
						img.onload = function() {
							image.addClass('online-prestige'+PLUGIN_ID_SUFFIX+'__img--loaded');
							loader.remove();
							if (serial) image.append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>');
						};
						img.src = Lampa.TMDB.image('t/p/w300' + (episode ? episode.still_path : object.movie.backdrop_path));
						images.push(img);
					}
					html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__timeline').append(Lampa.Timeline.render(element.timeline));
					if (viewed.indexOf(hash_behold) !== -1) {
						scroll_to_mark = html;
						html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__img').append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
					}
					element.mark = function() {
						viewed = Lampa.Storage.cache('online_view' + PLUGIN_ID_SUFFIX, 5000, []);
						if (viewed.indexOf(hash_behold) == -1) {
							viewed.push(hash_behold);
							Lampa.Storage.set('online_view' + PLUGIN_ID_SUFFIX, viewed);
							if (html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__viewed').length == 0) {
								html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__img').append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
							}
						}
						choice = _this8.getChoice();
						if (!serial) {
							choice.movie_view = hash_behold;
						} else {
							choice.episodes_view[element.season] = episode_num;
						}
						_this8.saveChoice(choice);
						var voice_name_text = choice.voice_name || element.voice_name || element.title;
						if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
						_this8.watched({
							balanser: balanser,
							balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser),
							voice_id: choice.voice_id,
							voice_name: voice_name_text,
							episode: element.episode,
							season: element.season
						});
					};
					element.unmark = function() {
						viewed = Lampa.Storage.cache('online_view' + PLUGIN_ID_SUFFIX, 5000, []);
						if (viewed.indexOf(hash_behold) !== -1) {
							Lampa.Arrays.remove(viewed, hash_behold);
							Lampa.Storage.set('online_view' + PLUGIN_ID_SUFFIX, viewed);
							Lampa.Storage.remove('online_view' + PLUGIN_ID_SUFFIX, hash_behold);
							html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__viewed').remove();
						}
					};
					element.timeclear = function() {
						element.timeline.percent = 0;
						element.timeline.time = 0;
						element.timeline.duration = 0;
						Lampa.Timeline.update(element.timeline);
					};
					html.on('hover:enter', function() {
						if (object.movie.id) {
							Lampa.Favorite.add('history', object.movie, 100);
							var user = Lampa.Storage.get('ab_account')
							if (object && object.movie && user) {
								try {
									$.ajax('//tracker.abmsx.tech/track', {
										method: 'post',
										type: 'POST',
										contentType: 'application/json',
										data: JSON.stringify({
											"balancer": balanser,
											"id": object.movie.id,
											"token": user.token,
											"userId": user.id,
											"name": object.search,
											"season": element.season || 0,
											"episode": element.episode || 0
										}),
										error: function(e) {
											console.log('track error request', e)
										}
									})
								} catch (e) {
									console.log('track error', e)
								}
							}
						}
						if (params.onEnter) params.onEnter(element, html, data);
					}).on('hover:focus', function(e) {
						last = e.target;
						if (params.onFocus) params.onFocus(element, html, data);
						scroll.update($(e.target), true);
					});
					if (params.onRender) params.onRender(element, html, data);
					_this8.contextMenu({
						html: html,
						element: element,
						onFile: function onFile(call) {
							if (params.onContextMenu) params.onContextMenu(element, html, data, call);
						},
						onClearAllMark: function onClearAllMark() {
							items.forEach(function(elem) {
								elem.unmark();
							});
						},
						onClearAllTime: function onClearAllTime() {
							items.forEach(function(elem) {
								elem.timeclear();
							});
						}
					});
					scroll.append(html);
				});
				if (serial && episodes.length > items.length && !params.similars) {
					var left = episodes.slice(items.length);
					left.forEach(function(episode) {
						var info = [];
						if (episode.vote_average) info.push(Lampa.Template.get('lampac_prestige_rate' + PLUGIN_ID_SUFFIX, {
							rate: parseFloat(episode.vote_average + '').toFixed(1)
						}, true));
						if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
						var air = new Date((episode.air_date + '').replace(/-/g, '/'));
						var now = Date.now();
						var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
						var txt = Lampa.Lang.translate('full_episode_days_left') + ': ' + day;
						var html = Lampa.Template.get('lampac_prestige_full' + PLUGIN_ID_SUFFIX, {
							time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
							info: info.length ? info.map(function(i) {
								return '<span>' + i + '</span>';
							}).join('<span class="online-prestige-split">●</span>') : '',
							title: episode.name,
							quality: day > 0 ? txt : ''
						});
						var loader = html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__loader');
						var image = html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__img');
						var season = items[0] ? items[0].season : 1;
						html.find('.online-prestige'+PLUGIN_ID_SUFFIX+'__timeline').append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join('')))));
						var img = html.find('img')[0];
						if (episode.still_path) {
							img.onerror = function() {
								img.src = './img/img_broken.svg';
							};
							img.onload = function() {
								image.addClass('online-prestige'+PLUGIN_ID_SUFFIX+'__img--loaded');
								loader.remove();
								image.append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>');
							};
							img.src = Lampa.TMDB.image('t/p/w300' + episode.still_path);
							images.push(img);
						} else {
							loader.remove();
							image.append('<div class="online-prestige'+PLUGIN_ID_SUFFIX+'__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>');
						}
						html.on('hover:focus', function(e) {
							last = e.target;
							scroll.update($(e.target), true);
						});
						html.css('opacity', '0.5');
						scroll.append(html);
					});
				}
				if (scroll_to_element) {
					last = scroll_to_element[0];
				} else if (scroll_to_mark) {
					last = scroll_to_mark[0];
				}
				Lampa.Controller.enable('content');
			});
		};
		this.contextMenu = function(params) {
			params.html.on('hover:long', function() {
				function show(extra) {
					var enabled = Lampa.Controller.enabled().name;
					var menu = [];
					if (Lampa.Platform.is('webos')) {
						menu.push({
							title: Lampa.Lang.translate('player_lauch') + ' - Webos',
							player: 'webos'
						});
					}
					if (Lampa.Platform.is('android')) {
						menu.push({
							title: Lampa.Lang.translate('player_lauch') + ' - Android',
							player: 'android'
						});
					}
					menu.push({
						title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
						player: 'lampa'
					});
					menu.push({
						title: Lampa.Lang.translate('lampac_video' + PLUGIN_ID_SUFFIX),
						separator: true
					});
					menu.push({
						title: Lampa.Lang.translate('torrent_parser_label_title'),
						mark: true
					});
					menu.push({
						title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
						unmark: true
					});
					menu.push({
						title: Lampa.Lang.translate('time_reset'),
						timeclear: true
					});
					if (extra) {
						menu.push({
							title: Lampa.Lang.translate('copy_link'),
							copylink: true
						});
					}
					menu.push({
						title: Lampa.Lang.translate('more'),
						separator: true
					});
					if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
						menu.push({
							title: Lampa.Lang.translate('lampac_voice_subscribe' + PLUGIN_ID_SUFFIX),
							subscribe: true
						});
					}
					menu.push({
						title: Lampa.Lang.translate('lampac_clear_all_marks' + PLUGIN_ID_SUFFIX),
						clearallmark: true
					});
					menu.push({
						title: Lampa.Lang.translate('lampac_clear_all_timecodes' + PLUGIN_ID_SUFFIX),
						timeclearall: true
					});
					Lampa.Select.show({
						title: Lampa.Lang.translate('title_action'),
						items: menu,
						onBack: function onBack() {
							Lampa.Controller.toggle(enabled);
						},
						onSelect: function onSelect(a) {
							if (a.mark) params.element.mark();
							if (a.unmark) params.element.unmark();
							if (a.timeclear) params.element.timeclear();
							if (a.clearallmark) params.onClearAllMark();
							if (a.timeclearall) params.onClearAllTime();
							Lampa.Controller.toggle(enabled);
							if (a.player) {
								Lampa.Player.runas(a.player);
								params.html.trigger('hover:enter');
							}
							if (a.copylink) {
								if (extra.quality) {
									var qual = [];
									for (var i in extra.quality) {
										qual.push({
											title: i,
											file: extra.quality[i]
										});
									}
									Lampa.Select.show({
										title: Lampa.Lang.translate('settings_server_links'),
										items: qual,
										onBack: function onBack() {
											Lampa.Controller.toggle(enabled);
										},
										onSelect: function onSelect(b) {
											Lampa.Utils.copyTextToClipboard(b.file, function() {
												Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
											}, function() {
												Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
											});
										}
									});
								} else {
									Lampa.Utils.copyTextToClipboard(extra.file, function() {
										Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
									}, function() {
										Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
									});
								}
							}
							if (a.subscribe) {
								Lampa.Account.subscribeToTranslation({
									card: object.movie,
									season: params.element.season,
									episode: params.element.translate_episode_end,
									voice: params.element.translate_voice
								}, function() {
									Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success' + PLUGIN_ID_SUFFIX));
								}, function() {
									Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_error' + PLUGIN_ID_SUFFIX));
								});
							}
						}
					});
				}
				params.onFile(show);
			}).on('hover:focus', function() {
				if (Lampa.Helper) Lampa.Helper.show('online_file' + PLUGIN_ID_SUFFIX, Lampa.Lang.translate('helper_online_file' + PLUGIN_ID_SUFFIX), params.html);
			});
		};
		this.empty = function() {
			var html = Lampa.Template.get('lampac_does_not_answer' + PLUGIN_ID_SUFFIX, {});
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__buttons').remove();
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__title').text(Lampa.Lang.translate('empty_title_two'));
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__time').text(Lampa.Lang.translate('empty_text'));
			scroll.clear();
			scroll.append(html);
			this.loading(false);
		};
		this.noConnectToServer = function(er) {
			var html = Lampa.Template.get('lampac_does_not_answer' + PLUGIN_ID_SUFFIX, {});
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__buttons').remove();
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__title').text(Lampa.Lang.translate('title_error'));
			var balanserNameText = (sources && sources[balanser]) ? sources[balanser].name : balanser;
			html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__time').text(er && er.accsdb ? er.msg : Lampa.Lang.translate('lampac_does_not_answer_text' + PLUGIN_ID_SUFFIX).replace('{balanser}', balanserNameText));
			scroll.clear();
			scroll.append(html);
			this.loading(false);
		};
		this.doesNotAnswer = function(er) {
			var _this9 = this;
			this.reset();
			var balanserNameText = (sources && sources[balanser]) ? sources[balanser].name : balanser;
			var html = Lampa.Template.get('lampac_does_not_answer' + PLUGIN_ID_SUFFIX, {
				balanser: balanserNameText
			});
			if (er && er.accsdb) html.find('.online-empty'+PLUGIN_ID_SUFFIX+'__title').html(er.msg);

			var tic = er && er.accsdb ? 10 : 5;
			html.find('.cancel').on('hover:enter', function() {
				clearInterval(balanser_timer);
			});
			html.find('.change').on('hover:enter', function() {
				clearInterval(balanser_timer);
				filter.render().find('.filter--sort').trigger('hover:enter');
			});
			scroll.clear();
			scroll.append(html);
			this.loading(false);
			balanser_timer = setInterval(function() {
				tic--;
				html.find('.timeout').text(tic);
				if (tic == 0) {
					clearInterval(balanser_timer);
					var keys = Lampa.Arrays.getKeys(sources);
					var indx = keys.indexOf(balanser);
					var next = keys[indx + 1];
					if (!next) next = keys[0];
					balanser = next;
					if (Lampa.Activity.active().activity == _this9.activity) _this9.changeBalanser(balanser);
				}
			}, 1000);
		};
		this.getLastEpisode = function(items) {
			var last_episode = 0;
			items.forEach(function(e) {
				if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
			});
			return last_episode;
		};
		this.start = function() {
			if (Lampa.Activity.active().activity !== this.activity) return;
			if (!initialized) {
				initialized = true;
				this.initialize();
			}
			Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
			Lampa.Controller.add('content', {
				toggle: function toggle() {
					Lampa.Controller.collectionSet(scroll.render(), files.render());
					Lampa.Controller.collectionFocus(last || false, scroll.render());
				},
				gone: function gone() {
					clearTimeout(balanser_timer);
				},
				up: function up() {
					if (Navigator.canmove('up')) {
						Navigator.move('up');
					} else Lampa.Controller.toggle('head');
				},
				down: function down() {
					Navigator.move('down');
				},
				right: function right() {
					if (Navigator.canmove('right')) Navigator.move('right');
					else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
				},
				left: function left() {
					if (Navigator.canmove('left')) Navigator.move('left');
					else Lampa.Controller.toggle('menu');
				},
				back: this.back.bind(this)
			});
			Lampa.Controller.toggle('content');
		};
		this.render = function() {
			return files.render();
		};
		this.back = function() {
			Lampa.Activity.backward();
		};
		this.pause = function() {};
		this.stop = function() {};
		this.destroy = function() {
			network.clear();
			this.clearImages();
			files.destroy();
			scroll.destroy();
			clearInterval(balanser_timer);
			clearTimeout(life_wait_timer);
			clearTimeout(hub_timer);
			if (hubConnection) {
				hubConnection.stop();
				hubConnection = null;
			}
		};
	}

	function startPlugin() {
		window['lampac_plugin' + PLUGIN_ID_SUFFIX] = true;
		var manifst = {
			type: 'video',
			version: '1.4.3',
			name: PLUGIN_NAME_DISPLAY,
			description: 'Плагин (' + PLUGIN_ID_SUFFIX.slice(1) + ') для просмотра онлайн сериалов и фильмов',
			component: 'lampac' + PLUGIN_ID_SUFFIX,
			onContextMenu: function onContextMenu(object) {
				return {
					name: Lampa.Lang.translate('lampac_watch' + PLUGIN_ID_SUFFIX),
					description: 'Плагин (' + PLUGIN_ID_SUFFIX.slice(1) + ') для просмотра онлайн сериалов и фильмов'
				};
			},
			onContextLauch: function onContextLauch(object) {
				resetTemplates();
				Lampa.Component.add('lampac' + PLUGIN_ID_SUFFIX, component);

				var id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title)
				var all = Lampa.Storage.get('clarification_search' + PLUGIN_ID_SUFFIX, '{}')

				Lampa.Activity.push({
					url: '',
					title: Lampa.Lang.translate('title_online' + PLUGIN_ID_SUFFIX),
					component: 'lampac' + PLUGIN_ID_SUFFIX,
					search: all[id] ? all[id] : object.title,
					search_one: object.title,
					search_two: object.original_title,
					movie: object,
					page: 1,
					clarification: all[id] ? true : false
				});
			}
		};
		
		if (typeof Lampa.Manifest.plugins === 'undefined' || 
		    (typeof Lampa.Manifest.plugins === 'object' && (!Lampa.Manifest.plugins.name || Lampa.Manifest.plugins.name.indexOf('Lampac') === -1))) {
		    Lampa.Manifest.plugins = manifst;
		} else {
		    console.log(PLUGIN_NAME_DISPLAY + ': Lampa.Manifest.plugins already set by another Lampac, manifest not overridden.');
		}
		
		Lampa.Component.add('lampac' + PLUGIN_ID_SUFFIX, component);

		var lang_keys = {
			['lampac_watch' + PLUGIN_ID_SUFFIX]: { ru: 'Смотреть онлайн (AB)', en: 'Watch online (AB)', uk: 'Дивитися онлайн (AB)', zh: '在线观看 (AB)'},
			['lampac_video' + PLUGIN_ID_SUFFIX]: { ru: 'Видео (AB)', en: 'Video (AB)', uk: 'Відео (AB)', zh: '视频 (AB)'},
			['lampac_no_watch_history' + PLUGIN_ID_SUFFIX]: { ru: 'Нет истории просмотра (AB)', en: 'No browsing history (AB)', ua: 'Немає історії перегляду (AB)', zh: '没有浏览历史 (AB)'},
			['lampac_nolink' + PLUGIN_ID_SUFFIX]: { ru: 'Не удалось извлечь ссылку (AB)', uk: 'Неможливо отримати посилання (AB)', en: 'Failed to fetch link (AB)', zh: '获取链接失败 (AB)'},
			['lampac_balanser' + PLUGIN_ID_SUFFIX]: { ru: 'Источник (AB)', uk: 'Джерело (AB)', en: 'Source (AB)', zh: '来源 (AB)'},
			['helper_online_file' + PLUGIN_ID_SUFFIX]: { ru: 'Удерживайте "ОК" для меню (AB)', uk: 'Утримуйте "ОК" для меню (AB)', en: 'Hold "OK" for menu (AB)', zh: '按住“确定”调出菜单 (AB)'},
			['title_online' + PLUGIN_ID_SUFFIX]: { ru: 'Онлайн (AB)', uk: 'Онлайн (AB)', en: 'Online (AB)', zh: '在线的 (AB)'},
			['lampac_voice_subscribe' + PLUGIN_ID_SUFFIX]: { ru: 'Подписаться на перевод (AB)', uk: 'Підписатися на переклад (AB)', en: 'Subscribe to translation (AB)', zh: '订阅翻译 (AB)'},
			['lampac_voice_success' + PLUGIN_ID_SUFFIX]: { ru: 'Вы успешно подписались (AB)', uk: 'Ви успішно підписалися (AB)', en: 'You have successfully subscribed (AB)', zh: '您已成功订阅 (AB)'},
			['lampac_voice_error' + PLUGIN_ID_SUFFIX]: { ru: 'Возникла ошибка (AB)', uk: 'Виникла помилка (AB)', en: 'An error has occurred (AB)', zh: '发生了错误 (AB)'},
			['lampac_clear_all_marks' + PLUGIN_ID_SUFFIX]: { ru: 'Очистить все метки (AB)', uk: 'Очистити всі мітки (AB)', en: 'Clear all labels (AB)', zh: '清除所有标签 (AB)'},
			['lampac_clear_all_timecodes' + PLUGIN_ID_SUFFIX]: { ru: 'Очистить все тайм-коды (AB)', uk: 'Очистити всі тайм-коди (AB)', en: 'Clear all timecodes (AB)', zh: '清除所有时间代码 (AB)'},
			['lampac_change_balanser' + PLUGIN_ID_SUFFIX]: { ru: 'Изменить балансер (AB)', uk: 'Змінити балансер (AB)', en: 'Change balancer (AB)', zh: '更改平衡器 (AB)'},
			['lampac_balanser_dont_work' + PLUGIN_ID_SUFFIX]: { ru: 'Поиск на ({balanser}) не дал результатов (AB)', uk: 'Пошук на ({balanser}) не дав результатів (AB)', en: 'Search on ({balanser}) did not return any results (AB)', zh: '搜索 ({balanser}) 未返回任何结果 (AB)'},
			['lampac_balanser_timeout' + PLUGIN_ID_SUFFIX]: { ru: 'Источник будет переключен через <span class="timeout">10</span> сек. (AB)', uk: 'Джерело буде переключено через <span class="timeout">10</span> сек. (AB)', en: 'Source will be switched in <span class="timeout">10</span> sec. (AB)', zh: '平衡器将在<span class="timeout">10</span>秒内自动切换 (AB)'},
			['lampac_does_not_answer_text' + PLUGIN_ID_SUFFIX]: { ru: 'Поиск на ({balanser}) не дал результатов (AB)', uk: 'Пошук на ({balanser}) не дав результатів (AB)', en: 'Search on ({balanser}) did not return any results (AB)', zh: '搜索 ({balanser}) 未返回任何结果 (AB)'}
		};
		Lampa.Lang.add(lang_keys);
		
		var lampac_css_content_ab = `
        <style>
        @charset 'UTF-8';
        .online-prestige${PLUGIN_ID_SUFFIX} {position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}
        .online-prestige${PLUGIN_ID_SUFFIX}__body {padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}
        @media screen and (max-width:480px){.online-prestige${PLUGIN_ID_SUFFIX}__body{padding:.8em 1.2em}}
        .online-prestige${PLUGIN_ID_SUFFIX}__img {position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}
        .online-prestige${PLUGIN_ID_SUFFIX}__img>img {position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}
        .online-prestige${PLUGIN_ID_SUFFIX}__img--loaded>img {opacity:1}
        @media screen and (max-width:480px){.online-prestige${PLUGIN_ID_SUFFIX}__img{width:7em;min-height:6em}}
        .online-prestige${PLUGIN_ID_SUFFIX}__folder {padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}
        .online-prestige${PLUGIN_ID_SUFFIX}__folder>svg {width:4.4em !important;height:4.4em !important}
        .online-prestige${PLUGIN_ID_SUFFIX}__viewed {position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}
        .online-prestige${PLUGIN_ID_SUFFIX}__viewed>svg {width:1.5em !important;height:1.5em !important}
        .online-prestige${PLUGIN_ID_SUFFIX}__episode-number {position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}
        .online-prestige${PLUGIN_ID_SUFFIX}__loader {position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-o-background-size:contain;background-size:contain}
        .online-prestige${PLUGIN_ID_SUFFIX}__head,.online-prestige${PLUGIN_ID_SUFFIX}__footer {display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}
        .online-prestige${PLUGIN_ID_SUFFIX}__timeline {margin:.8em 0}
        .online-prestige${PLUGIN_ID_SUFFIX}__timeline>.time-line {display:block !important}
        .online-prestige${PLUGIN_ID_SUFFIX}__title {font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}
        @media screen and (max-width:480px){.online-prestige${PLUGIN_ID_SUFFIX}__title{font-size:1.4em}}
        .online-prestige${PLUGIN_ID_SUFFIX}__time {padding-left:2em}
        .online-prestige${PLUGIN_ID_SUFFIX}__info {display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}
        .online-prestige${PLUGIN_ID_SUFFIX}__info>* {overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}
        .online-prestige${PLUGIN_ID_SUFFIX}__quality {padding-left:1em;white-space:nowrap}
        .online-prestige${PLUGIN_ID_SUFFIX}__scan-file {position:absolute;bottom:0;left:0;right:0}
        .online-prestige${PLUGIN_ID_SUFFIX}__scan-file .broadcast__scan {margin:0}
        .online-prestige${PLUGIN_ID_SUFFIX} .online-prestige-split {font-size:.8em;margin:0 1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}
        .online-prestige${PLUGIN_ID_SUFFIX}.focus::after {content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}
        .online-prestige${PLUGIN_ID_SUFFIX}+.online-prestige${PLUGIN_ID_SUFFIX} {margin-top:1.5em}
        .online-prestige${PLUGIN_ID_SUFFIX}--folder .online-prestige${PLUGIN_ID_SUFFIX}__footer {margin-top:.8em}
        .online-prestige${PLUGIN_ID_SUFFIX}-watched {padding:1em}
        .online-prestige${PLUGIN_ID_SUFFIX}-watched__icon>svg {width:1.5em;height:1.5em}
        .online-prestige${PLUGIN_ID_SUFFIX}-watched__body {padding-left:1em;padding-top:.1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}
        .online-prestige${PLUGIN_ID_SUFFIX}-watched__body>span+span::before {content:' ● ';vertical-align:top;display:inline-block;margin:0 .5em}
        .online-prestige${PLUGIN_ID_SUFFIX}-rate {display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}
        .online-prestige${PLUGIN_ID_SUFFIX}-rate>svg {width:1.3em !important;height:1.3em !important}
        .online-prestige${PLUGIN_ID_SUFFIX}-rate>span {font-weight:600;font-size:1.1em;padding-left:.7em}
        .online-empty${PLUGIN_ID_SUFFIX} {line-height:1.4}
        .online-empty${PLUGIN_ID_SUFFIX}__title {font-size:1.8em;margin-bottom:.3em}
        .online-empty${PLUGIN_ID_SUFFIX}__time {font-size:1.2em;font-weight:300;margin-bottom:1.6em}
        .online-empty${PLUGIN_ID_SUFFIX}__buttons {display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}
        .online-empty${PLUGIN_ID_SUFFIX}__buttons>*+* {margin-left:1em}
        .online-empty${PLUGIN_ID_SUFFIX}__button {background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}
        .online-empty${PLUGIN_ID_SUFFIX}__button.focus {background:#fff;color:black}
        .online-empty${PLUGIN_ID_SUFFIX}__templates .online-empty${PLUGIN_ID_SUFFIX}-template:nth-child(2) {opacity:.5}
        .online-empty${PLUGIN_ID_SUFFIX}__templates .online-empty${PLUGIN_ID_SUFFIX}-template:nth-child(3) {opacity:.2}
        .online-empty${PLUGIN_ID_SUFFIX}-template {background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;border-radius:.3em}
        .online-empty${PLUGIN_ID_SUFFIX}-template>* {background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;border-radius:.3em}
        .online-empty${PLUGIN_ID_SUFFIX}-template__ico {width:4em;height:4em;margin-right:2.4em}
        .online-empty${PLUGIN_ID_SUFFIX}-template__body {height:1.7em;width:70%}
        .online-empty${PLUGIN_ID_SUFFIX}-template+.online-empty${PLUGIN_ID_SUFFIX}-template {margin-top:1em}
        .torrent-list${PLUGIN_ID_SUFFIX} .online-prestige${PLUGIN_ID_SUFFIX}+.online-prestige${PLUGIN_ID_SUFFIX} { margin-top: 1.5em; } /* Пример добавления класса к torrent-list */
        </style>
        `;
		Lampa.Template.add('lampac_css' + PLUGIN_ID_SUFFIX, lampac_css_content_ab);
		$('body').append(Lampa.Template.get('lampac_css' + PLUGIN_ID_SUFFIX, {}, true));


		function resetTemplates() {
			Lampa.Template.add('lampac_prestige_full' + PLUGIN_ID_SUFFIX, `<div class="online-prestige${PLUGIN_ID_SUFFIX} online-prestige${PLUGIN_ID_SUFFIX}--full selector">
            <div class="online-prestige${PLUGIN_ID_SUFFIX}__img">
                <img alt="">
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__loader"></div>
            </div>
            <div class="online-prestige${PLUGIN_ID_SUFFIX}__body">
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__head">
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__title">{title}</div>
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__time">{time}</div>
                </div>
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__timeline"></div>
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__footer">
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__info">{info}</div>
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__quality">{quality}</div>
                </div>
            </div>
        </div>`);
			Lampa.Template.add('lampac_content_loading' + PLUGIN_ID_SUFFIX, `<div class="online-empty${PLUGIN_ID_SUFFIX}">
            <div class="broadcast__scan"><div></div></div>
            <div class="online-empty${PLUGIN_ID_SUFFIX}__templates">
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template selector">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
            </div>
        </div>`);
			Lampa.Template.add('lampac_does_not_answer' + PLUGIN_ID_SUFFIX, `<div class="online-empty${PLUGIN_ID_SUFFIX}">
            <div class="online-empty${PLUGIN_ID_SUFFIX}__title">
                #{lampac_balanser_dont_work${PLUGIN_ID_SUFFIX}}
            </div>
            <div class="online-empty${PLUGIN_ID_SUFFIX}__time">
                #{lampac_balanser_timeout${PLUGIN_ID_SUFFIX}}
            </div>
            <div class="online-empty${PLUGIN_ID_SUFFIX}__buttons">
                <div class="online-empty${PLUGIN_ID_SUFFIX}__button selector cancel">#{cancel}</div>
                <div class="online-empty${PLUGIN_ID_SUFFIX}__button selector change">#{lampac_change_balanser${PLUGIN_ID_SUFFIX}}</div>
            </div>
            <div class="online-empty${PLUGIN_ID_SUFFIX}__templates">
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
                <div class="online-empty${PLUGIN_ID_SUFFIX}-template">
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__ico"></div>
                    <div class="online-empty${PLUGIN_ID_SUFFIX}-template__body"></div>
                </div>
            </div>
        </div>`);
			Lampa.Template.add('lampac_prestige_rate' + PLUGIN_ID_SUFFIX, `<div class="online-prestige${PLUGIN_ID_SUFFIX}-rate">
            <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z" fill="#fff"></path>
            </svg>
            <span>{rate}</span>
        </div>`);
			Lampa.Template.add('lampac_prestige_folder' + PLUGIN_ID_SUFFIX, `<div class="online-prestige${PLUGIN_ID_SUFFIX} online-prestige${PLUGIN_ID_SUFFIX}--folder selector">
            <div class="online-prestige${PLUGIN_ID_SUFFIX}__folder">
                <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect y="20" width="128" height="92" rx="13" fill="white"></rect>
                    <path d="M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z" fill="white" fill-opacity="0.23"></path>
                    <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"></rect>
                </svg>
            </div>
            <div class="online-prestige${PLUGIN_ID_SUFFIX}__body">
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__head">
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__title">{title}</div>
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__time">{time}</div>
                </div>
                <div class="online-prestige${PLUGIN_ID_SUFFIX}__footer">
                    <div class="online-prestige${PLUGIN_ID_SUFFIX}__info">{info}</div>
                </div>
            </div>
        </div>`);
			Lampa.Template.add('lampac_prestige_watched' + PLUGIN_ID_SUFFIX, `<div class="online-prestige${PLUGIN_ID_SUFFIX} online-prestige${PLUGIN_ID_SUFFIX}-watched selector">
            <div class="online-prestige${PLUGIN_ID_SUFFIX}-watched__icon">
                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10.5" cy="10.5" r="9" stroke="currentColor" stroke-width="3"/>
                    <path d="M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="online-prestige${PLUGIN_ID_SUFFIX}-watched__body">
            </div>
        </div>`);
		}
		
		resetTemplates();

		var button_html = `<div class="full-start__button selector view--online lampac--button${PLUGIN_ID_SUFFIX}" data-subtitle="${PLUGIN_NAME_DISPLAY} v${manifst.version}">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 392.697 392.697" xml:space="preserve">
            <path d="M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145
                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18
                C19.784,81.593,20.584,82.847,21.837,83.419z" fill="currentColor"></path>
            <path d="M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386
                c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5
                c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185
                l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945
                V180.445C187.735,179.076,186.936,177.831,185.689,177.261z" fill="currentColor"></path>
            <path d="M389.24,95.74c-1.002-0.644-2.264-0.732-3.347-0.238l-178.876,81.76c-1.246,0.57-2.045,1.814-2.045,3.185v208.751
                c0,1.191,0.606,2.302,1.608,2.945c0.572,0.367,1.23,0.555,1.892,0.555c0.495,0,0.991-0.104,1.455-0.315l178.876-81.768
                c1.246-0.568,2.045-1.813,2.045-3.185V98.685C390.849,97.494,390.242,96.384,389.24,95.74z" fill="currentColor"></path>
            <path d="M372.915,80.216c-0.009-1.377-0.823-2.621-2.082-3.18l-60.182-26.681c-0.938-0.418-2.013-0.399-2.938,0.045
                l-173.755,82.992l60.933,29.117c0.462,0.211,0.958,0.316,1.455,0.316s0.993-0.105,1.455-0.316l173.066-79.092
                C372.122,82.847,372.923,81.593,372.915,80.216z" fill="currentColor"></path>
        </svg>
        <span>#{title_online${PLUGIN_ID_SUFFIX}}</span>
    </div>`;

		function addButton(e) {
			if (e.render.find('.lampac--button' + PLUGIN_ID_SUFFIX).length) return;
			var btn = $(Lampa.Lang.translate(button_html));
			btn.on('hover:enter', function() {
				resetTemplates();
				Lampa.Component.add('lampac' + PLUGIN_ID_SUFFIX, component);

				var id = Lampa.Utils.hash(e.movie.number_of_seasons ? e.movie.original_name : e.movie.original_title)
				var all = Lampa.Storage.get('clarification_search' + PLUGIN_ID_SUFFIX, '{}')

				Lampa.Activity.push({
					url: '',
					title: Lampa.Lang.translate('title_online' + PLUGIN_ID_SUFFIX),
					component: 'lampac' + PLUGIN_ID_SUFFIX,
					search: all[id] ? all[id] : e.movie.title,
					search_one: e.movie.title,
					search_two: e.movie.original_title,
					movie: e.movie,
					page: 1,
					clarification: all[id] ? true : false
				});
			});
			e.render.after(btn);
		}
		Lampa.Listener.follow('full', function(e) {
			if (e.type == 'complite') {
				addButton({
					render: e.object.activity.render().find('.view--torrent'),
					movie: e.data.movie
				});
			}
		});
		try {
			if (Lampa.Activity.active().component == 'full') {
				addButton({
					render: Lampa.Activity.active().activity.render().find('.view--torrent'),
					movie: Lampa.Activity.active().card
				});
			}
		} catch (e) {}
		if (Lampa.Manifest.app_digital >= 177) {
			var balansers_sync = ["filmix", 'filmixtv', "fxapi", "rezka", "rhsprem", "lumex", "videodb", "collaps", "hdvb", "zetflix", "kodik", "ashdi", "kinoukr", "kinotochka", "remux", "iframevideo", "cdnmovies", "anilibria", "animedia", "animego", "animevost", "animebesst", "redheadsound", "alloha", "animelib", "moonanime", "kinopub", "vibix", "vdbmovies", "fancdn", "cdnvideohub", "vokino", "rc/filmix", "rc/fxapi", "rc/kinopub", "rc/rhs", "vcdn"];
			balansers_sync.forEach(function(name) {
				Lampa.Storage.sync('online_choice_' + name + PLUGIN_ID_SUFFIX, 'object_object');
			});
			Lampa.Storage.sync('online_watched_last' + PLUGIN_ID_SUFFIX, 'object_object');
		}
	}
	if (!window['lampac_plugin' + PLUGIN_ID_SUFFIX]) startPlugin();

})();
