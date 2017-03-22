'use strict';

function getDeepValue(obj, pathArray, defaultValue)
{
	if(pathArray.length == 0)
		return obj;
	else if(!(obj instanceof Object) || obj[pathArray[0]] === undefined)
		return defaultValue;
	else
		return getDeepValue(obj[pathArray[0]], pathArray.slice(1), defaultValue);
}

function parseCategories(cats)
{
	return cats.split(';').map(function(cat){
		return cat.trim().split('.');
	});
}

AFRAME.registerComponent('json', {
	schema: {type: 'src'},
	init: function(){
		this.el.json = {};
	},
	update: function(){
		try {
			this.el.json = JSON.parse(THREE.Cache.files[this.data]);
		}
		catch(e){
			console.error('Unable to parse', this.data);
		}
	}
});

AFRAME.registerComponent('mixin-on', {
	schema: {
		on: {type: 'string'},
		mixins: {type: 'array'}
	},
	init: function(){
		var self = this;
		this.el.addEventListener(this.data.on, function(){
			self.el.setAttribute('mixin', self.data.mixins.join(' '));
		});
	}
});

AFRAME.registerComponent('hud-question-id', {
	dependencies: ['json', 'n-text'],
	schema: {type: 'array'},
	update: function(){
		var phrase = getDeepValue(this.el.json, this.data, '');
		if(this.data.length > 0 && phrase)
			this.el.setAttribute('n-text', 'text', phrase);
	}
});

AFRAME.registerComponent('hud-next-question', {
	schema: {
		on: {type: 'string', default: 'click'}
	},
	init: function()
	{
		this.advanceQuestion = this._advanceQuestion.bind(this);
		this.el.addEventListener(this.data.on, this.advanceQuestion);
	},
	initCategories: function()
	{
		function sum(acc, val){
			return acc + val;
		}

		var userId = this.el.sceneEl.systems['sync-system'].userInfo.userId;
		this.target = document.querySelector('[data-creator-user-id="'+userId+'"]');
		var catString = this.el.sceneEl.dataset.categories;
		this.catPaths = parseCategories(catString);

		// pretend the categories are all in one long array
		// this array stores the first index of each category in that array
		this.catOffsets =
			this.catPaths
			.map(function(name){
				return getDeepValue(this.target.json, name, []).length;
			}, this)
			.map(function(length, i, array){
				return array.slice(0, i+1).reduce(sum, 0);
			});

		// the first item in the offsets list is always zero
		this.catOffsets.unshift(0);
	},
	remove: function(){
		this.el.removeEventListener(this.data.on, this.advanceQuestion);
	},
	_advanceQuestion: function()
	{
		if(!this.target || !this.catPaths || !this.catOffsets){
			this.initCategories();
		}

		var totalLength = this.catOffsets[this.catOffsets.length-1];
		var newQTotalIndex = Math.floor( Math.random() * totalLength );

		// find the category that the randomly chosen index falls in
		var catIndex = this.catOffsets.findIndex( function(el, i, array){
			return newQTotalIndex >= el && newQTotalIndex < array[i+1];
		});

		// create a copy of the category path
		var newQPath = this.catPaths[catIndex].slice();
		newQPath.push( newQTotalIndex - this.catOffsets[catIndex] );

		// update the question id with the new name
		this.target.setAttribute('hud-question-id', newQPath);
	}
});