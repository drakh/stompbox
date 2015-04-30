var AudioFade=new Class({

	Extends   : Fx,
	initialize: function (el, options)
	{
		this.parent(options);
		this.el=el;
		this.set_gain(0);
	},
	start     : function (from, to)
	{
		if (!to)
		{
			to=from;
			from=this.val;
		}
		this.parent(from, to);
	},
	set_gain  : function (val)
	{
		this.val=val;
		this.el.volume=val;
	},
	compute   : function (from, to, delta)
	{
		var v=this.parent(from, to, delta);
		this.set_gain(v);
	}
});


var AudioPlayer=new Class({
	Implements : [
		Events,
		Options
	],
	options    : {
		duration: 1000
	},
	initialize : function (el, options)
	{
		this.setOptions(options);
		this.el=el;
		var o=this.options;
		this.e=new Element('audio', {
			preload: 'auto',
			loop   : 'loop'
		}).inject(el);
		this.e.onloadeddata=this.audio_ready.bind(this);
		this.fader=new AudioFade(this.e);
		this.set_volume(0);
	},
	set_volume : function (v)
	{
		this.fader.set_gain(v);
	},
	fade_in    : function ()
	{
		this.fader.cancel();
		this.fader.start(1);
	},
	fade_out   : function ()
	{
		this.fader.cancel();
		this.fader.start(0);
	},
	load_audio : function (s)
	{
		this.e.src=s;
	},
	start      : function ()
	{
		this.e.play();
	},
	audio_ready: function (s)
	{
		this.e.currentTime=0;
		this.fireEvent('ready');
	}
});


var EffectPlayer=new Class({
	Implements         : [
		Events,
		Options
	],
	options            : {
		styles       : 4,
		presets      : 5,
		max_knobs    : 4,
		mute_class   : 'e-muted',
		style_title  : 'Select style',
		knob_class   : 'fa fa-chevron-circle-up',
		time         : 1000,
		zero_position: 210
	},
	initialize         : function (el, options)
	{
		this.setOptions(options);
		this.current_efx=false;
		this.loaded=false;
		this.players=[];
		this.knob_pos=[];
		this.knob_conf=[];
		var o=this.options;
		this.build_html(el);
		this.r=new Request.JSON({
			onSuccess: this.a_success.bind(this),
			onError  : this.a_error.bind(this)
		});
		this.create_players((o.presets + 1) * o.styles, el);
		this.set_default();
	},
	build_html         : function (el)
	{
		var w=new Element('div', {class: 'e-player'});
		this.build_style_html(w);
		this.build_preset_html(w);
		this.build_knobs_html(w);
		w.inject(el);
		this.player_el=w;
		this.spinner_el=new Element('div', {
			html  : '<i class="fa fa-spinner fa-spin"></i>',
			styles: {
				'font-size': '400%'
			}
		}).inject(el);
	},
	build_knobs_html   : function (el)
	{
		var o=this.options;
		var w=new Element('section', {class: 'e-knobs e-col'}).inject(el);
		var ul=new Element('ul').inject(w);
		var a=[];
		for (var i=0; i<o.max_knobs; i++)
		{
			var li=new Element('li').inject(ul);
			a[i]=new Element('i', {
				class : o.knob_class,
				styles: {
					transition: o.time + 'ms transform',
					transform : 'rotate(' + o.zero_position + 'deg)'
				}
			}).inject(li);
		}
		this.knobs=a;
	},
	build_preset_html  : function (el)
	{
		var o=this.options;
		var w=new Element('section', {class: 'e-presetsel e-col'}).inject(el);
		var ul=new Element('ul').inject(w);
		var a=[]
		for (var i=0; i<=o.presets; i++)
		{
			var li=new Element('li').inject(ul);
			a[i]=new Element('a', {
				text  : (i==o.presets ? 'B' : (i + 1)),
				events: {
					click: this.select_preset.bind(this, i)
				}
			}).inject(li);
		}
		this.preset_buttons=a;
	},
	build_style_html   : function (el)
	{
		var o=this.options;
		var w=new Element('section', {class: 'e-stylesel e-col'}).inject(el);
		this.mute_button=new Element('a', {
			html  : '<i class="fa fa-volume-up"></i>',
			class : 'e-mute',
			events: {
				click: this.mute_click.bind(this)
			}
		}).inject(w);
		new Element('header', {text: o.style_title}).inject(w);
		this.build_style_buttons(w);

	},
	build_style_buttons: function (el)
	{
		var o=this.options;
		var w=new Element('ul').inject(el);
		var a=[];
		for (var i=0; i<o.styles; i++)
		{
			var el=new Element('li', {
				class: ('e-style-' + (i + 1))
			}).inject(w);
			a[i]=new Element('a', {
				events: {
					click: this.select_style.bind(this, i)
				}
			}).inject(el);
		}
		this.style_buttons=a;
	},
	select_preset      : function (i, e)
	{
		if (e)
		{
			e.stop();
		}
		this.seleted_preset=i;
		var b=this.preset_buttons;
		for (var j=0; j<b.length; j++)
		{
			if (j==i)
			{
				b[j].addClass('e-sel');
			}
			else
			{
				b[j].removeClass('e-sel')
			}
		}
		this.change();
	},
	select_style       : function (i, e)
	{
		if (e)
		{
			e.stop();
		}
		this.selected_style=i;
		var b=this.style_buttons;
		for (var j=0; j<b.length; j++)
		{
			if (j==i)
			{
				b[j].addClass('e-sel');
			}
			else
			{
				b[j].removeClass('e-sel')
			}
		}
		this.change();
	},
	mute_click         : function ()
	{
		if (this.muted==true)
		{
			this.unmute();
		}
		else
		{
			this.mute();
		}
	},
	mute               : function ()
	{
		this.muted=true;
		this.mute_button.addClass(this.options.mute_class);
		for (var i=0; i<this.players.length; i++)
		{
			this.players[i].set_volume(0);
		}
	}
	,
	unmute             : function ()
	{
		this.muted=false;
		this.mute_button.removeClass(this.options.mute_class);
		this.change();
	},
	change             : function ()
	{
		if (this.loaded===true)
		{
			var o=this.options;
			var s=this.selected_style;
			var p=this.seleted_preset;
			for (var i=0; i<o.styles; i++)
			{
				for (var j=0; j<=o.presets; j++)
				{
					var k=i * (o.presets + 1) + j;
					if (i==s && j==p)
					{
						this.players[k].fade_in();
					}
					else
					{
						this.players[k].fade_out();
					}
				}
			}
			var preset=this.knob_pos[p];
			var conf=this.knob_conf;
			var knobs=this.knobs;
			for (var i=0; i<conf.length; i++)
			{
				var c=conf[i].range;
				var pos=(c / 100) * preset[i];
				knobs[i].setStyles({
					transform: 'rotate(' + (o.zero_position + pos) + 'deg)'
				});
			}
		}
	},
	set_default        : function ()
	{
		this.mute();
		this.select_style(0);
		this.select_preset(this.options.presets);
		this.player_el.addClass('hidden');
		this.spinner_el.setStyles({
			display: 'none'
		});
	},
	create_players     : function (c, el)
	{
		var a=[];
		this.loaded_players=[];
		for (var i=0; i<c; i++)
		{
			this.loaded_players[i]=false;
			a[i]=new AudioPlayer(el, {
				onReady: this.audio_ready.bind(this, i)
			});
		}
		this.players=a;
	},
	get_data           : function (e_id)
	{
		if (this.current_efx!=e_id)
		{
			this.tmp_efx=e_id;
			this.mute();
			this.spinner_el.setStyles({
				display: 'block'
			});
			var r=this.r;
			for (var i=0; i<this.loaded_players.length; i++)
			{
				this.loaded_players[i]=false;
				this.players[i].set_volume(0);
			}
			this.loaded=false;
			r.cancel();
			r.setOptions({url: 'json-data/' + e_id + '.json'});
			r.get();
		}
	},
	audio_ready        : function (i)
	{
		this.loaded_players[i]=true;
		var loaded=true;
		for (var j=0; j<this.loaded_players; j++)
		{
			if (this.loaded_players==false)
			{
				loaded=false;
			}
		}
		this.loaded=loaded;
		if (loaded==true)
		{
			this.start();
		}
	},
	start              : function ()
	{
		this.spinner_el.setStyles({
			display: 'none'
		});
		this.player_el.removeClass('hidden');

		for (var i=0; i<this.players.length; i++)
		{
			this.players[i].start();
		}
		this.unmute();
	},
	a_success          : function (d)
	{
		var o=this.options;
		this.current_efx=this.tmp_efx;
		this.knob_pos=d.presets;
		this.knob_conf=d.knobs;
		for (var i=0; i<o.styles; i++)
		{
			for (var j=0; j<=o.presets; j++)
			{
				var k=i * (o.presets + 1) + j;
				var s='';
				if (j==o.presets)
				{
					s=d.sources[j] + i + '.mp3';
				}
				else
				{
					s=d.sources[j] + i + '/' + j + '.mp3';
				}
				this.players[k].load_audio(s);
			}
		}
		for (var i=0; i<this.knobs.length; i++)
		{
			if (i>(d.knobs.length - 1))
			{
				this.knobs[i].addClass('hidden');
			}
			else
			{
				this.knobs[i].removeClass('hidden');
				this.knobs[i].set('title', d.knobs[i].name);
			}
		}

	},
	a_error            : function ()
	{
		console.log('something went wrong');
	}
});

var EffectPlayerApp={
	start         : function ()
	{
		this.player=new EffectPlayer(document.id('player'), {
			styles : 4,
			presets: 2
		});
		this.bind_events('.reel article a');
	},
	bind_events   : function (s)
	{
		var els=$$(s);
		for (var i=0; i<els.length; i++)
		{
			var el=els[i];
			var d=el.get('data-effectid');
			el.addEvent('click', this.effect_clicked.bind(this, d));
		}
	},
	effect_clicked: function (e_id, e)
	{
		if (e)
		{
			e.stop();
		}
		this.player.get_data(e_id);
	}
}
window.addEvent('domready', EffectPlayerApp.start.bind(EffectPlayerApp));